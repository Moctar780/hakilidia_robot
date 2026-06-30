import express from 'express';
import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { SerialPort } from 'serialport';
import { WebSocketServer } from 'ws';
import type { CompileRequest, PortInfo, ServiceEvent, SparkiCommandRequest, CameraStatus, CameraGestureCommand, CameraGestureEvent } from '@blocklyduino/shared';

const PORT = Number(process.env.BLOCKLYDUINO_SERVICE_PORT ?? 8080);
const HOST = process.env.BLOCKLYDUINO_SERVICE_HOST ?? '127.0.0.1';
const CLI = process.env.ARDUINO_CLI_BIN ?? 'arduino-cli';
const SHOW_SYSTEM_TTY = process.env.BLOCKLYDUINO_SHOW_SYSTEM_TTY === '1';
const SPARKI_DEFAULT_PORT = process.env.SPARKI_PORT ?? '/dev/ttyACM0';
const SPARKI_DEFAULT_BAUD = Number(process.env.SPARKI_BAUD ?? 9600);

/* ===== Gestion du processus caméra (sparki_djelia) ===== */
const SPARKI_DJELIA_DIR = process.env.SPARKI_DJELIA_DIR ?? path.resolve(process.env.HOME ?? '/home/moctar', 'Desktop/projets/arduino/sparki_djelia');
const SPARKI_DJELIA_VENV = process.env.SPARKI_DJELIA_VENV ?? path.join(SPARKI_DJELIA_DIR, '.venv/bin/python');

let cameraProcess: ChildProcess | null = null;
let cameraProcessStartedAt: string | null = null;

function getCameraStatus(): CameraStatus {
  return {
    running: cameraProcess !== null && cameraProcess.exitCode === null,
    pid: cameraProcess?.pid ?? null,
    startedAt: cameraProcessStartedAt,
    scriptDir: SPARKI_DJELIA_DIR,
  };
}

/** Parse une ligne stdout du processus caméra pour extraire une commande gestuelle.
 *  Format: "Commande caméra : w" ou "Commande caméra : GO 1"
 *  La recherche est plus flexible pour gérer les préfixes/décalages de buffer. */
const CAMERA_CMD_RE = /Commande caméra\s*:\s*(\S+(?:\s+\S+)?)/i;
const DIRECTION_MAP: Record<string, CameraGestureCommand> = {
  w: 'forward',
  x: 'backward',
  a: 'left',
  d: 'right',
  s: 'stop',
  'GO 1': 'gripper_open',
  'GC 1': 'gripper_close',
  GS: 'gripper_stop',
};

function parseCameraLine(line: string): CameraGestureEvent | null {
  const match = line.trim().match(CAMERA_CMD_RE);
  if (!match) return null;
  const rawCmd = match[1];
  const direction = DIRECTION_MAP[rawCmd] ?? 'stop';
  return {
    type: 'cameraGesture',
    direction,
    command: rawCmd,
    timestamp: Date.now(),
  };
}

function startCameraProcess(mirror: boolean, controlMode: 'buttons' | 'pointing', simulate: boolean): Promise<CameraStatus> {
  return new Promise((resolve, reject) => {
    if (cameraProcess && cameraProcess.exitCode === null) {
      resolve(getCameraStatus());
      return;
    }

    const pythonBin = existsSync(SPARKI_DJELIA_VENV) ? SPARKI_DJELIA_VENV : 'python3';
    // Flag -u pour stdout non bufferisé (redondant avec PYTHONUNBUFFERED=1)
    const args = ['-u', 'main.py', 'camera'];
    // En mode simulation, on ne connecte pas le robot physique
    if (simulate) args.push('--no-sparki');
    if (mirror) args.push('--mirror');
    if (controlMode === 'pointing') {
      args.push('--control-mode', 'pointing');
    }

    cameraProcess = spawn(pythonBin, args, {
      cwd: SPARKI_DJELIA_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
    });

    cameraProcessStartedAt = new Date().toISOString();
    let stdoutBuffer = '';

    cameraProcess.stdout?.on('data', (chunk: Buffer) => {
      const text = String(chunk);
      broadcast({ type: 'serialData', data: `[CAMÉRA] ${text}` });

      // Bufferiser et parser ligne par ligne pour extraire les gestes
      stdoutBuffer += text;
      const lines = stdoutBuffer.split('\n');
      // Garder la dernière ligne incomplète dans le buffer
      stdoutBuffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        const gesture = parseCameraLine(line);
        if (gesture) {
          console.log(`[caméra geste] ${gesture.command} → ${gesture.direction}`);
          broadcast(gesture);
        } else {
          // Loguer les lignes non-reconnues pour debug (uniquement si inhabituelles)
          const trimmed = line.trim();
          if (!trimmed.startsWith('[') && !trimmed.startsWith('Mode') && !trimmed.startsWith('Aucune')) {
            console.log(`[caméra stdout] ${trimmed}`);
          }
        }
      }
    });

    cameraProcess.stderr?.on('data', (chunk: Buffer) => {
      const text = String(chunk);
      broadcast({ type: 'compileError', message: `[CAMÉRA] ${text}` });
      console.error(`[caméra stderr] ${text}`);
    });

    cameraProcess.on('error', (error) => {
      cameraProcess = null;
      cameraProcessStartedAt = null;
      broadcast({ type: 'compileError', message: `[CAMÉRA] Erreur: ${error.message}` });
      reject(error);
    });

    cameraProcess.on('exit', (code) => {
      const msg = `[CAMÉRA] Processus arrêté (code ${code})`;
      broadcast({ type: 'serialData', data: `${msg}\n` });
      // Envoyer un geste STOP pour arrêter le robot simulé
      broadcast({ type: 'cameraGesture', direction: 'stop', command: 's', timestamp: Date.now() });
      console.log(msg);
      cameraProcess = null;
      cameraProcessStartedAt = null;
    });

    // Attendre un peu pour détecter un échec rapide (ex: caméra inaccessible)
    setTimeout(() => {
      if (cameraProcess && cameraProcess.exitCode === null) {
        resolve(getCameraStatus());
      } else if (cameraProcess === null) {
        reject(new Error('Impossible de démarrer le processus caméra.'));
      }
    }, 1500);
  });
}

function stopCameraProcess(): CameraStatus {
  if (cameraProcess && cameraProcess.exitCode === null) {
    cameraProcess.kill('SIGTERM');
    // Force kill après 3s si le processus ne répond pas
    setTimeout(() => {
      if (cameraProcess && cameraProcess.exitCode === null) {
        cameraProcess.kill('SIGKILL');
      }
    }, 3000);
  }
  cameraProcess = null;
  cameraProcessStartedAt = null;
  return getCameraStatus();
}

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use((_req, res, next) => {
  res.setHeader('access-control-allow-origin', process.env.BLOCKLYDUINO_SERVICE_CORS_ORIGIN ?? '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
  next();
});
app.options(/.*/, (_req, res) => res.sendStatus(204));

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/events' });

function broadcast(event: ServiceEvent) {
  const payload = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}

function runCommand(command: string, args: string[], cwd?: string): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, shell: false });
    let output = '';
    child.stdout.on('data', (chunk) => {
      const text = String(chunk);
      output += text;
      broadcast({ type: 'compileOutput', message: text });
    });
    child.stderr.on('data', (chunk) => {
      const text = String(chunk);
      output += text;
      broadcast({ type: 'compileError', message: text });
    });
    child.on('error', (error) => {
      const message = `${command}: ${error.message}`;
      output += message;
      resolve({ code: 1, output });
    });
    child.on('close', (code) => resolve({ code: code ?? 1, output }));
  });
}

async function withSketch<T>(code: string, callback: (sketchDir: string) => Promise<T>) {
  const dir = await mkdtemp(path.join(tmpdir(), 'blocklyduino-'));
  const sketchName = path.basename(dir);
  const sketchFile = path.join(dir, `${sketchName}.ino`);
  try {
    await writeFile(sketchFile, code, 'utf8');
    return await callback(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function compileSketch(body: CompileRequest, upload: boolean) {
  return withSketch(body.code, async (sketchDir) => {
    const args = upload
      ? ['upload', '-b', body.fqbn, '-p', body.port ?? '', sketchDir]
      : ['compile', '-b', body.fqbn, sketchDir];
    const filteredArgs = args.filter(Boolean);
    if (body.detailed) {
      filteredArgs.splice(1, 0, '-v');
    }
    const result = await runCommand(CLI, filteredArgs);
    return { ok: result.code === 0, output: result.output };
  });
}

function expectsSparkiReply(command: string) {
  return /^PING$/i.test(command.trim());
}

function normalizeSparkiCommand(command: string) {
  return command.trim().replace(/\s+/g, ' ');
}

function assertValidSparkiCommand(command: string) {
  const normalized = normalizeSparkiCommand(command);
  const valid =
    /^[wxads]$/i.test(normalized) ||
    /^S$/i.test(normalized) ||
    /^STOP$/i.test(normalized) ||
    /^PING$/i.test(normalized) ||
    /^V\s+\d{1,3}$/i.test(normalized) ||
    /^F\s+\d{1,3}$/i.test(normalized) ||
    /^B\s+\d{1,3}$/i.test(normalized) ||
    /^TL\s+\d{1,3}$/i.test(normalized) ||
    /^TR\s+\d{1,3}$/i.test(normalized) ||
    /^M\s+-?\d{1,3}\s+-?\d{1,3}$/i.test(normalized) ||
    /^L\s+-?\d{1,3}$/i.test(normalized) ||
    /^R\s+-?\d{1,3}$/i.test(normalized) ||
    /^GO(?:\s+\d{1,3})?$/i.test(normalized) ||
    /^GC(?:\s+\d{1,3})?$/i.test(normalized) ||
    /^GS$/i.test(normalized);
  if (!valid) {
    throw new Error(`Commande Sparki non autorisée: ${command}`);
  }
  return normalized;
}

function sendSparkiCommand(body: SparkiCommandRequest) {
  return new Promise<{ ok: boolean; command: string; port: string; reply?: string }>((resolve, reject) => {
    const command = assertValidSparkiCommand(body.command);
    const portPath = body.port || SPARKI_DEFAULT_PORT;
    const baudRate = body.baud || SPARKI_DEFAULT_BAUD;
    const expectReply = body.expectReply ?? expectsSparkiReply(command);
    const port = new SerialPort({ path: portPath, baudRate, autoOpen: false });
    let reply = '';
    let settled = false;

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      if (port.isOpen) {
        port.close(() => callback());
      } else {
        callback();
      }
    };

    const timeout = setTimeout(() => {
      finish(() => reject(new Error(`Timeout Sparki sur ${portPath}.`)));
    }, expectReply ? 3000 : 800);

    port.on('data', (chunk) => {
      reply += String(chunk);
      if (reply.includes('\n')) {
        clearTimeout(timeout);
        finish(() => resolve({ ok: true, command, port: portPath, reply: reply.trim() }));
      }
    });

    port.open((error) => {
      if (error) {
        clearTimeout(timeout);
        finish(() => reject(error));
        return;
      }
      port.flush(() => {
        port.write(`${command}\n`, (writeError) => {
          if (writeError) {
            clearTimeout(timeout);
            finish(() => reject(writeError));
            return;
          }
          port.drain(() => {
            if (!expectReply) {
              clearTimeout(timeout);
              finish(() => resolve({ ok: true, command, port: portPath }));
            }
          });
        });
      });
    });
  });
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'blocklyduino-arduino-service' });
});

app.get('/ports', async (_req, res) => {
  try {
    const ports = await SerialPort.list();
    const mapped: PortInfo[] = ports
      .filter((port) => SHOW_SYSTEM_TTY || !/^\/dev\/ttyS\d+$/.test(port.path))
      .map((port) => ({
        address: port.path,
        label: `${port.path}${port.manufacturer ? ` - ${port.manufacturer}` : ''}`,
        protocol: port.pnpId,
      }));
    if (!mapped.some((port) => port.address === SPARKI_DEFAULT_PORT) && existsSync(SPARKI_DEFAULT_PORT)) {
      mapped.unshift({
        address: SPARKI_DEFAULT_PORT,
        label: `${SPARKI_DEFAULT_PORT} - Sparki probable`,
        protocol: 'sparki-default',
      });
    }
    res.json({ ports: mapped });
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : String(error));
  }
});

app.post('/sparki/command', async (req, res) => {
  try {
    const result = await sendSparkiCommand(req.body as SparkiCommandRequest);
    broadcast({ type: 'serialData', data: `Sparki ${result.command}${result.reply ? ` -> ${result.reply}` : ''}\n` });
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    broadcast({ type: 'compileError', message: `Sparki: ${message}\n` });
    res.status(500).json({ ok: false, command: String(req.body?.command ?? ''), port: req.body?.port ?? SPARKI_DEFAULT_PORT, error: message });
  }
});

app.post('/sparki/ping', async (req, res) => {
  try {
    res.json(await sendSparkiCommand({ ...(req.body as SparkiCommandRequest), command: 'PING', expectReply: true }));
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : String(error));
  }
});

app.get('/boards', async (_req, res) => {
  const result = await runCommand(CLI, ['board', 'list']);
  res.status(result.code === 0 ? 200 : 500).json({ ok: result.code === 0, output: result.output });
});

app.post('/verify/', async (req, res) => {
  try {
    res.json(await compileSketch(req.body as CompileRequest, false));
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : String(error));
  }
});

app.post('/upload/', async (req, res) => {
  try {
    const body = req.body as CompileRequest;
    if (!body.port) {
      res.status(400).send('Aucun port série sélectionné.');
      return;
    }
    res.json(await compileSketch(body, true));
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : String(error));
  }
});

app.post('/cli/core-update', async (_req, res) => {
  const result = await runCommand(CLI, ['core', 'update-index']);
  res.status(result.code === 0 ? 200 : 500).json({ ok: result.code === 0, output: result.output });
});

app.post('/cli/install-board', async (req, res) => {
  const result = await runCommand(CLI, ['core', 'install', String(req.body.package ?? '')]);
  res.status(result.code === 0 ? 200 : 500).json({ ok: result.code === 0, output: result.output });
});

app.post('/cli/search-lib', async (req, res) => {
  const result = await runCommand(CLI, ['lib', 'search', String(req.body.query ?? '')]);
  res.status(result.code === 0 ? 200 : 500).json({ ok: result.code === 0, output: result.output });
});

app.post('/cli/install-lib', async (req, res) => {
  const result = await runCommand(CLI, ['lib', 'install', String(req.body.library ?? '')]);
  res.status(result.code === 0 ? 200 : 500).json({ ok: result.code === 0, output: result.output });
});

/* ===== Endpoints contrôle caméra ===== */

/** Démarrer le processus de contrôle par caméra */
app.post('/camera/start', async (req, res) => {
  try {
    const mirror = req.body?.mirror !== false;
    const controlMode: 'buttons' | 'pointing' = req.body?.controlMode ?? 'buttons';
    const simulate = req.body?.simulate !== false; // par défaut: mode simulation
    const status = await startCameraProcess(mirror, controlMode, simulate);
    res.json({ ok: true, status });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message, status: getCameraStatus() });
  }
});

/** Arrêter le processus caméra */
app.post('/camera/stop', (_req, res) => {
  const status = stopCameraProcess();
  res.json({ ok: true, status });
});

/** Obtenir l'état du processus caméra */
app.get('/camera/status', (_req, res) => {
  res.json({ ok: true, status: getCameraStatus() });
});

/** Recevoir un geste du bridge Python (mode physique) et le broadcast aux clients WebSocket */
app.post('/camera/gesture', (req, res) => {
  try {
    const { command } = req.body as { command?: string };
    if (!command) {
      res.status(400).json({ ok: false, error: 'Commande manquante' });
      return;
    }
    const direction = DIRECTION_MAP[command] ?? 'stop';
    const gesture: CameraGestureEvent = {
      type: 'cameraGesture',
      direction,
      command,
      timestamp: Date.now(),
    };
    broadcast(gesture);
    res.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ ok: false, error: message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`BlocklyDuino Arduino service: http://${HOST}:${PORT}`);
});
