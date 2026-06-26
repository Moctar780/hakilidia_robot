import type { AiDetectionResult, AiDetectionKind, AiSprite } from '../constants';

export type RuntimeContext = {
  openCamera: () => Promise<void>;
  closeCamera: () => void;
  detect: (kind: AiDetectionKind) => Promise<AiDetectionResult>;
  updateSprite: (updater: (sprite: AiSprite) => AiSprite) => void;
  sendRobotCommand?: (command: string, expectReply?: boolean) => Promise<unknown>;
  say: (message: string) => void;
  log: (message: string) => void;
  shouldStop: () => boolean;
};

const COMMAND_PATTERN = /(?:AI|ROBOT)_([A-Z_]+)\((.*)\);?/;
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

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
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

function countExecutableCommands(lines: string[]) {
  return lines.filter((line) => {
    const trimmed = line.trim();
    return trimmed.startsWith('AI_') || trimmed.startsWith('ROBOT_');
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

  const [, command, rawArgs = ''] = match;
  const args = parseArgs(rawArgs);

  if (command === 'CAMERA_OPEN') {
    await context.openCamera();
    context.log('Caméra ouverte.');
  } else if (command === 'CAMERA_CLOSE') {
    context.closeCamera();
    context.log('Caméra fermée.');
  } else if (command === 'DETECT') {
    const kind = (args[0] || 'object') as AiDetectionKind;
    const result = await context.detect(kind);
    context.say(`${result.label} (${Math.round(result.confidence * 100)} %)`);
  } else if (command === 'SPRITE_MOVE') {
    const steps = Number(args[0] || 10);
    context.updateSprite((sprite) => ({ ...sprite, x: sprite.x + steps }));
    context.log(`Sprite avancé de ${steps} pas.`);
  } else if (command === 'SPRITE_TURN') {
    const degrees = Number(args[0] || 15);
    context.updateSprite((sprite) => ({ ...sprite, direction: sprite.direction + degrees }));
    context.log(`Sprite tourné de ${degrees} degrés.`);
  } else if (command === 'SPRITE_SAY') {
    context.say(args[0] || 'Bonjour');
  } else if (command === 'WAIT') {
    const seconds = Number(args[0] || 1);
    context.log(`Pause ${seconds}s.`);
    await sleep(seconds * 1000);
  } else if (command === 'FORWARD') {
    const steps = Number(args[0] || 10);
    await sendRobot(context, `F ${steps}`);
    context.updateSprite((sprite) => ({ ...sprite, x: sprite.x + steps }));
    context.log(`Robot avance de ${steps} pas.`);
  } else if (command === 'BACKWARD') {
    const steps = Number(args[0] || 10);
    await sendRobot(context, `B ${steps}`);
    context.updateSprite((sprite) => ({ ...sprite, x: sprite.x - steps }));
    context.log(`Robot recule de ${steps} pas.`);
  } else if (command === 'TURN_LEFT') {
    const degrees = Number(args[0] || 90);
    await sendRobot(context, `TL ${degrees}`);
    context.updateSprite((sprite) => ({ ...sprite, direction: sprite.direction - degrees }));
    context.log(`Robot tourne à gauche de ${degrees} degrés.`);
  } else if (command === 'TURN_RIGHT') {
    const degrees = Number(args[0] || 90);
    await sendRobot(context, `TR ${degrees}`);
    context.updateSprite((sprite) => ({ ...sprite, direction: sprite.direction + degrees }));
    context.log(`Robot tourne à droite de ${degrees} degrés.`);
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
  } else {
    context.log(`Commande inconnue: ${command}`);
  }
}

async function executeLines(lines: string[], context: RuntimeContext, start = 0, end = lines.length) {
  for (let index = start; index < end; index += 1) {
    if (context.shouldStop()) {
      context.log('Programme arrêté.');
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

    if (line.startsWith('AI_') || line.startsWith('ROBOT_')) {
      await executeCommand(line, context);
    }
  }
}

export async function runAiProgram(code: string, context: RuntimeContext) {
  const lines = code.split('\n');
  if (countExecutableCommands(lines) === 0) {
    context.log('Aucune commande IA ou Robot trouvée. Ajoute des blocs des catégories IA ou Robot.');
    return;
  }

  await executeLines(lines, context);
}
