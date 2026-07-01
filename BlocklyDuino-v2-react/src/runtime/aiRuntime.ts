import type { AiDetectionResult, AiDetectionKind, AiSprite, PhoneControlRequest, PhoneSensorReading } from '../constants';
import type { Rover3D } from '../constants';
import { roverPhysics } from '../lib/roverPhysicsStore';

export type RuntimeContext = {
  openCamera: () => Promise<void>;
  closeCamera: () => void;
  detect: (kind: AiDetectionKind) => Promise<AiDetectionResult>;
  updateSprite: (updater: (sprite: AiSprite) => AiSprite) => void;
  updateRover: (updater: (rover: Rover3D) => Rover3D) => void;
  sendRobotCommand?: (command: string, expectReply?: boolean) => Promise<unknown>;
  connectPhone?: (host?: string) => Promise<unknown>;
  configurePhoneSensors?: (request: PhoneControlRequest) => Promise<unknown>;
  readPhoneSensor?: (type: string) => Promise<PhoneSensorReading | null>;
  startPhoneUdp?: () => Promise<void>;
  stopPhoneUdp?: () => Promise<void>;
  usePhoneCamera?: (enabled: boolean) => void;
  openCameraPreview?: () => void;
  say: (message: string) => void;
  log: (message: string) => void;
  shouldStop: () => boolean;
};

const COMMAND_PATTERN = /(AI|ROBOT|PHONE|ROVER)_([A-Z_]+)\((.*)\);?/;
const MAX_LOOP_ITERATIONS = 100;

function parseArgs(raw: string) {
  if (!raw.trim()) {
    return [];
  }
  return raw
    .split(',')
    .map((part) => part.trim())
    .map((part) => part.replace(/^["']|["']$/g, ''));
}

/** Sommeil interrompible : vérifie `shouldStop()` tous les 100 ms
 *  pour que le bouton "Arrêter" reste réactif pendant les longs mouvements. */
function interruptibleSleep(ms: number, shouldStop: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    let remaining = ms;
    function tick() {
      if (shouldStop()) {
        resolve(); // arrêt immédiat
        return;
      }
      if (remaining <= 0) {
        resolve(); // durée écoulée
        return;
      }
      const step = Math.min(100, remaining);
      remaining -= step;
      window.setTimeout(tick, step);
    }
    tick();
  });
}

async function sendRobot(context: RuntimeContext, command: string, expectReply = true) {
  if (!context.sendRobotCommand) {
    return;
  }
  try {
    await context.sendRobotCommand(command, expectReply);
    context.log(`Commande Sparki envoyée: ${command}`);
  } catch (error) {
    context.log(`Sparki non joignable (${command}): ${error instanceof Error ? error.message : String(error)}`);
  }
}

function readingSummary(reading: PhoneSensorReading | null) {
  if (!reading) {
    return 'aucune donnée';
  }
  if (reading.values?.length) {
    return reading.values.map((value) => Number(value).toFixed(2)).join(', ');
  }
  if (typeof reading.latitude === 'number' && typeof reading.longitude === 'number') {
    return `${reading.latitude.toFixed(5)}, ${reading.longitude.toFixed(5)}`;
  }
  if (typeof reading.rms === 'number' || typeof reading.peak === 'number') {
    return `rms=${(reading.rms ?? 0).toFixed(2)}, peak=${(reading.peak ?? 0).toFixed(2)}`;
  }
  return reading.type;
}

async function readPhone(context: RuntimeContext, type: string) {
  if (!context.readPhoneSensor) {
    context.log('Lecture téléphone indisponible.');
    return null;
  }
  try {
    const reading = await context.readPhoneSensor(type);
    context.log(`Téléphone ${type}: ${readingSummary(reading)}`);
    return reading;
  } catch (error) {
    context.log(`Téléphone ${type} indisponible: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function countExecutableCommands(lines: string[]) {
  return lines.filter((line) => {
    const trimmed = line.trim();
    return trimmed.startsWith('AI_') || trimmed.startsWith('ROBOT_') || trimmed.startsWith('PHONE_') || trimmed.startsWith('ROVER_');
  }).length;
}

function matchingBraceIndex(lines: string[], openIndex: number) {
  let depth = 0;
  for (let index = openIndex; index < lines.length; index += 1) {
    const line = lines[index];
    depth += (line.match(/\{/g) ?? []).length;
    depth -= (line.match(/\}/g) ?? []).length;
    if (depth === 0) {
      return index;
    }
  }
  return openIndex;
}

function loopIterations(line: string) {
  const repeatMatch = line.match(/^for\s*\(\s*int\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*(-?\d+)\s*;\s*\w+\+\+\s*\)\s*\{$/);
  if (repeatMatch) {
    return Math.max(0, Number(repeatMatch[1]));
  }

  const forMatch = line.match(
    /^for\s*\(\s*int\s+\w+\s*=\s*(-?\d+)\s*;\s*\w+\s*(<=|>=|<|>)\s*(-?\d+)\s*;\s*\w+\s*(\+\+|--|\+=\s*\d+|-=\s*\d+)\s*\)\s*\{$/,
  );
  if (!forMatch) {
    return null;
  }

  const start = Number(forMatch[1]);
  const operator = forMatch[2];
  const end = Number(forMatch[3]);
  const stepToken = forMatch[4].replace(/\s+/g, '');
  const step = stepToken === '++' ? 1 : stepToken === '--' ? -1 : Number(stepToken.slice(2)) * (stepToken.startsWith('+=') ? 1 : -1);
  if (step === 0) {
    return 0;
  }

  let count = 0;
  for (let value = start; count < MAX_LOOP_ITERATIONS; value += step) {
    const keepGoing =
      operator === '<=' ? value <= end : operator === '>=' ? value >= end : operator === '<' ? value < end : value > end;
    if (!keepGoing) {
      break;
    }
    count += 1;
  }
  return count;
}

async function executeCommand(commandLine: string, context: RuntimeContext) {
  const match = commandLine.match(COMMAND_PATTERN);
  if (!match) {
    context.log(`Commande ignorée: ${commandLine}`);
    return;
  }

  const [, domain, command, rawArgs = ''] = match;
  const args = parseArgs(rawArgs);

  if (domain === 'PHONE') {
    if (command === 'CONNECT') {
      await context.connectPhone?.(args[0]);
      context.log(args[0] ? `Téléphone configuré: ${args[0]}` : 'Téléphone connecté.');
    } else if (command === 'ACTIVATE') {
      const sensors = (args[0] || 'android.sensor.accelerometer,android.sensor.gyroscope')
        .split('|')
        .map((sensor) => sensor.trim())
        .filter(Boolean);
      await context.configurePhoneSensors?.({
        sensors,
        gps: true,
        micro: true,
        camera: true,
        streaming: 'start',
        cameraResolution: 'LOW',
        cameraIntervalMs: 100,
      });
      context.log('Flux téléphone activés.');
    } else if (command === 'READ_ACCELEROMETER') {
      await readPhone(context, 'android.sensor.accelerometer');
    } else if (command === 'READ_GYROSCOPE') {
      await readPhone(context, 'android.sensor.gyroscope');
    } else if (command === 'READ_GPS') {
      await readPhone(context, 'android.gps');
    } else if (command === 'READ_MICROPHONE') {
      await readPhone(context, 'android.microphone.level');
    } else if (command === 'USE_CAMERA') {
      context.usePhoneCamera?.(true);
      context.log('Caméra téléphone utilisée pour la détection IA.');
    } else if (command === 'CAMERA_WINDOW_OPEN') {
      context.openCameraPreview?.();
      context.log('Fenêtre caméra ouverte.');
    } else if (command === 'VISION_START') {
      await context.configurePhoneSensors?.({
        sensors: ['android.sensor.accelerometer', 'android.sensor.gyroscope'],
        gps: false,
        micro: false,
        camera: true,
        streaming: 'start',
        cameraResolution: 'LOW',
        cameraIntervalMs: 100,
      });
      context.usePhoneCamera?.(true);
      context.openCameraPreview?.();
      context.log('Vision téléphone prête.');
    } else if (command === 'USE_LOCAL_CAMERA') {
      context.usePhoneCamera?.(false);
      context.log('Caméra locale utilisée pour la détection IA.');
    } else if (command === 'UDP_START') {
      await context.startPhoneUdp?.();
    } else if (command === 'UDP_STOP') {
      await context.stopPhoneUdp?.();
    } else if (command === 'DRIVE_TILT') {
      const threshold = Number(args[0] || 2);
      const reading = await readPhone(context, 'android.sensor.accelerometer');
      const [x = 0, y = 0] = reading?.values ?? [];
      if (Math.abs(y) > Math.abs(x) && Math.abs(y) >= threshold) {
        await sendRobot(context, y < 0 ? 'F 10' : 'B 10');
        context.log(y < 0 ? 'Inclinaison: robot avance.' : 'Inclinaison: robot recule.');
      } else if (Math.abs(x) >= threshold) {
        await sendRobot(context, x < 0 ? 'TL 20' : 'TR 20');
        context.log(x < 0 ? 'Inclinaison: robot tourne à gauche.' : 'Inclinaison: robot tourne à droite.');
      } else {
        await sendRobot(context, 's', false);
        context.log('Inclinaison faible: robot arrêté.');
      }
    } else if (command === 'STOP_ON_NOISE') {
      const threshold = Number(args[0] || 0.35);
      const reading = await readPhone(context, 'android.microphone.level');
      const level = Math.max(reading?.rms ?? 0, reading?.peak ?? 0);
      if (level >= threshold) {
        await sendRobot(context, 's', false);
        context.log(`Bruit ${level.toFixed(2)} >= ${threshold}: robot arrêté.`);
      } else {
        context.log(`Bruit ${level.toFixed(2)} < ${threshold}: aucune action.`);
      }
    } else {
      context.log(`Commande téléphone inconnue: ${command}`);
    }
    return;
  }

  if (command === 'CAMERA_OPEN') {
    await context.openCamera();
    context.openCameraPreview?.();
    context.log('Caméra ouverte.');
  } else if (command === 'CAMERA_CLOSE') {
    context.closeCamera();
    context.log('Caméra fermée.');
  } else if (command === 'DETECT') {
    const kind = (args[0] || 'object') as AiDetectionKind;
    const result = await context.detect(kind);
    const offsetText = typeof result.offset === 'number' ? `, offset ${result.offset.toFixed(2)}` : '';
    context.say(`${result.label} (${Math.round(result.confidence * 100)} %${offsetText})`);
  } else if (command === 'FOLLOW_LINE') {
    const forwardSteps = Number(args[0] || 10);
    const turnDegrees = Number(args[1] || 15);
    const result = await context.detect('line');
    const offset = result.offset ?? 0;
    if (result.label === 'perdue' || result.confidence < 0.05) {
      await sendRobot(context, 's', false);
      context.log('Ligne perdue: robot arrêté.');
    } else if (offset < -0.12 || result.label === 'gauche') {
      await sendRobot(context, `TL ${turnDegrees}`, false);
      context.log(`Ligne à gauche (offset ${offset.toFixed(2)}): tourner à gauche.`);
    } else if (offset > 0.12 || result.label === 'droite') {
      await sendRobot(context, `TR ${turnDegrees}`, false);
      context.log(`Ligne à droite (offset ${offset.toFixed(2)}): tourner à droite.`);
    } else {
      await sendRobot(context, `F ${forwardSteps}`, false);
      context.log(`Ligne centrée (offset ${offset.toFixed(2)}): avancer.`);
    }
  } else if (command === 'SPRITE_MOVE') {
    const steps = Number(args[0] || 10);
    context.updateSprite((sprite) => ({ ...sprite, x: sprite.x + steps }));
    context.log(`Sprite avancé de ${steps} pas.`);
  } else if (command === 'SPRITE_TURN') {
    const degrees = Number(args[0] || 15);
    context.updateSprite((sprite) => ({ ...sprite, direction: sprite.direction + degrees }));
    spriteDirection = (spriteDirection + degrees) % 360;
    context.log(`Sprite tourné de ${degrees} degrés.`);
  } else if (command === 'SPRITE_SAY') {
    context.say(args[0] || 'Bonjour');
  } else if (command === 'WAIT') {
    const seconds = Number(args[0] || 1);
    context.log(`Pause ${seconds}s.`);
    await interruptibleSleep(seconds * 1000, () => context.shouldStop());
  } else if (command === 'FORWARD') {
    const steps = Number(args[0] || 10);
    await sendRobot(context, `F ${steps}`);
    context.updateSprite((sprite) => ({ ...sprite, x: sprite.x + steps }));
    spriteDirection = (context as unknown as { _lastSpriteDir?: number })._lastSpriteDir ?? 90;
    context.updateRover?.((rover) => {
      const angleRad = (rover.rotation.y * Math.PI) / 180;
      currentRoverSpeed = rover.speed;
      return {
        ...rover,
        position: {
          x: rover.position.x - Math.sin(angleRad) * steps * 0.2,
          y: rover.position.y,
          z: rover.position.z + Math.cos(angleRad) * steps * 0.2,
        },
      };
    });
    const dur = Math.abs(steps) * 200 * (100 / Math.max(currentRoverSpeed, 1));
    context.log(`Robot avance de ${steps} pas (${Math.round(dur)}ms).`);
    await interruptibleSleep(dur, () => context.shouldStop());
  } else if (command === 'BACKWARD') {
    const steps = Number(args[0] || 10);
    await sendRobot(context, `B ${steps}`);
    context.updateSprite((sprite) => ({ ...sprite, x: sprite.x - steps }));
    spriteDirection = (context as unknown as { _lastSpriteDir?: number })._lastSpriteDir ?? 90;
    context.updateRover?.((rover) => {
      const angleRad = (rover.rotation.y * Math.PI) / 180;
      currentRoverSpeed = rover.speed;
      return {
        ...rover,
        position: {
          x: rover.position.x + Math.sin(angleRad) * steps * 0.2,
          y: rover.position.y,
          z: rover.position.z - Math.cos(angleRad) * steps * 0.2,
        },
      };
    });
    const dur = Math.abs(steps) * 200 * (100 / Math.max(currentRoverSpeed, 1));
    context.log(`Robot recule de ${steps} pas (${Math.round(dur)}ms).`);
    await interruptibleSleep(dur, () => context.shouldStop());
  } else if (command === 'TURN_LEFT') {
    const degrees = Number(args[0] || 90);
    await sendRobot(context, `TL ${degrees}`);
    context.updateSprite((sprite) => ({ ...sprite, direction: sprite.direction - degrees }));
    spriteDirection = (spriteDirection - degrees) % 360;
    context.updateRover?.((rover) => {
      currentRoverSpeed = rover.speed;
      return {
        ...rover,
        rotation: { ...rover.rotation, y: ((rover.rotation.y - degrees) % 360) },
      };
    });
    const dur = Math.abs(degrees) * 15 * (100 / Math.max(currentRoverSpeed, 1));
    context.log(`Robot tourne à gauche de ${degrees}° (${Math.round(dur)}ms).`);
    await interruptibleSleep(dur, () => context.shouldStop());
  } else if (command === 'TURN_RIGHT') {
    const degrees = Number(args[0] || 90);
    await sendRobot(context, `TR ${degrees}`);
    context.updateSprite((sprite) => ({ ...sprite, direction: sprite.direction + degrees }));
    spriteDirection = (spriteDirection + degrees) % 360;
    context.updateRover?.((rover) => {
      currentRoverSpeed = rover.speed;
      return {
        ...rover,
        rotation: { ...rover.rotation, y: ((rover.rotation.y + degrees) % 360) },
      };
    });
    const dur = Math.abs(degrees) * 15 * (100 / Math.max(currentRoverSpeed, 1));
    context.log(`Robot tourne à droite de ${degrees}° (${Math.round(dur)}ms).`);
    await interruptibleSleep(dur, () => context.shouldStop());
  } else if (command === 'SET_SPEED') {
    const speed = Number(args[0] || 50);
    await sendRobot(context, `V ${speed}`);
    context.log(`Vitesse robot réglée à ${speed}%.`);
  } else if (command === 'STOP') {
    await sendRobot(context, 's', false);
    context.log('Robot arrêté.');
  } else if (command === 'GRIPPER_OPEN') {
    const cm = Number(args[0] || 3);
    await sendRobot(context, `GO ${cm}`);
    context.log(`Pince ouverte de ${cm} cm.`);
  } else if (command === 'GRIPPER_CLOSE') {
    const cm = Number(args[0] || 3);
    await sendRobot(context, `GC ${cm}`);
    context.log(`Pince fermée de ${cm} cm.`);
  } else if (command === 'GRIPPER_STOP') {
    await sendRobot(context, 'GS');
    context.log('Pince arrêtée.');
  }

  /* ==========================================================================
     Commandes Rover 3D – utilisent Rapier (physique) via le store.
     Les impulsions sont appliquées au RigidBody pour un mouvement
     réaliste avec accélération et inertie.
     ========================================================================== */

  else if (domain === 'ROVER' && command === 'FORWARD') {
    const steps = Number(args[0] || 2);
    const speed = Math.max(currentRoverSpeed, 50);
    roverPhysics.forward(speed);
    const duration = Math.abs(steps) * 300 * (100 / speed);
    context.log(`Rover avance (moteurs) — ${Math.round(duration)}ms.`);
    await interruptibleSleep(duration, context.shouldStop);
    roverPhysics.stop();
  } else if (domain === 'ROVER' && command === 'BACKWARD') {
    const steps = Number(args[0] || 2);
    const speed = Math.max(currentRoverSpeed, 50);
    roverPhysics.backward(speed);
    const duration = Math.abs(steps) * 300 * (100 / speed);
    context.log(`Rover recule (moteurs) — ${Math.round(duration)}ms.`);
    await interruptibleSleep(duration, context.shouldStop);
    roverPhysics.stop();
  } else if (domain === 'ROVER' && command === 'LEFT') {
    const steps = Number(args[0] || 2);
    const speed = Math.max(currentRoverSpeed, 50);
    roverPhysics.strafeLeft(speed);
    const duration = Math.abs(steps) * 300 * (100 / speed);
    context.log(`Rover translate gauche (moteurs) — ${Math.round(duration)}ms.`);
    await interruptibleSleep(duration, context.shouldStop);
    roverPhysics.stop();
  } else if (domain === 'ROVER' && command === 'RIGHT') {
    const steps = Number(args[0] || 2);
    const speed = Math.max(currentRoverSpeed, 50);
    roverPhysics.strafeRight(speed);
    const duration = Math.abs(steps) * 300 * (100 / speed);
    context.log(`Rover translate droite (moteurs) — ${Math.round(duration)}ms.`);
    await interruptibleSleep(duration, context.shouldStop);
    roverPhysics.stop();
  } else if (domain === 'ROVER' && command === 'YAW_LEFT') {
    const degrees = Number(args[0] || 15);
    const speed = Math.max(currentRoverSpeed, 50);
    roverPhysics.rotateLeft(speed);
    const duration = Math.abs(degrees) * 15 * (100 / speed);
    context.log(`Rover pivote gauche (moteurs) — ${Math.round(duration)}ms.`);
    await interruptibleSleep(duration, context.shouldStop);
    roverPhysics.stop();
  } else if (domain === 'ROVER' && command === 'YAW_RIGHT') {
    const degrees = Number(args[0] || 15);
    const speed = Math.max(currentRoverSpeed, 50);
    roverPhysics.rotateRight(speed);
    const duration = Math.abs(degrees) * 15 * (100 / speed);
    context.log(`Rover pivote droite (moteurs) — ${Math.round(duration)}ms.`);
    await interruptibleSleep(duration, context.shouldStop);
    roverPhysics.stop();
  } else if (domain === 'ROVER' && command === 'SET_SPEED') {
    const speed = Number(args[0] || 50);
    currentRoverSpeed = speed;
    context.updateRover((rover) => ({ ...rover, speed }));
    context.log(`Vitesse rover réglée à ${speed}%.`);
  } else if (domain === 'ROVER' && command === 'STOP') {
    roverPhysics.stop();
    context.log('Rover arrêté.');
  } else if (domain === 'ROVER' && command === 'GRIPPER_OPEN') {
    const width = Number(args[0] || 3);
    context.updateRover((rover) => ({
      ...rover,
      gripperState: 'open',
      gripperWidth: width,
    }));
    context.log(`Pince rover ouverte (${width} cm).`);
    await interruptibleSleep(500, () => context.shouldStop());
  } else if (domain === 'ROVER' && command === 'GRIPPER_CLOSE') {
    context.updateRover((rover) => ({
      ...rover,
      gripperState: 'closed',
      gripperWidth: 0,
    }));
    context.log('Pince rover fermée.');
    await interruptibleSleep(500, () => context.shouldStop());
  } else if (domain === 'ROVER' && command === 'READ_ULTRASONIC') {
    context.log('Capteur ultrason: simulation active, pas d\'obstacle détecté.');
  } else {
    context.log(`Commande inconnue: ${command}`);
  }
}

/* Variables globales pour le rover 3D */
let spriteDirection = 90;
let currentRoverSpeed = 50;

async function executeLines(lines: string[], context: RuntimeContext, start = 0, end = lines.length) {
  for (let index = start; index < end; index += 1) {
    if (context.shouldStop()) {
      context.log('Programme arrêté.');
      roverPhysics.stop();
      return;
    }

    const line = lines[index].trim();
    if (!line || line === '}') {
      continue;
    }

    const iterations = loopIterations(line);
    if (iterations !== null) {
      const closeIndex = matchingBraceIndex(lines, index);
      const cappedIterations = Math.min(iterations, MAX_LOOP_ITERATIONS);
      if (iterations > MAX_LOOP_ITERATIONS) {
        context.log(`Boucle limitée à ${MAX_LOOP_ITERATIONS} répétitions.`);
      }
      for (let loopIndex = 0; loopIndex < cappedIterations; loopIndex += 1) {
        await executeLines(lines, context, index + 1, closeIndex);
      }
      index = closeIndex;
      continue;
    }

    if (line.startsWith('while')) {
      context.log('Boucle while ignorée par sécurité. Utilise plutôt "répéter N fois".');
      index = matchingBraceIndex(lines, index);
      continue;
    }

    if (line.startsWith('AI_') || line.startsWith('ROBOT_') || line.startsWith('PHONE_') || line.startsWith('ROVER_')) {
      await executeCommand(line, context);
    }
  }
}

export async function runAiProgram(code: string, context: RuntimeContext) {
  // Réinitialiser l'état global pour éviter les interférences entre exécutions
  spriteDirection = 90;
  currentRoverSpeed = 50;

  // Réinitialiser la position du rover dans la physique Rapier
  roverPhysics.reset();

  const lines = code.split('\n');
  if (countExecutableCommands(lines) === 0) {
    context.log('Aucune commande IA, Robot ou Téléphone trouvée. Ajoute des blocs des catégories IA, Robot ou Capteurs téléphone.');
    return;
  }

  await executeLines(lines, context);
}
