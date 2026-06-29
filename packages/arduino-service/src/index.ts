import express from 'express';
import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { SerialPort } from 'serialport';
import { WebSocketServer } from 'ws';
import type { CompileRequest, PortInfo, ServiceEvent, SparkiCommandRequest } from '@blocklyduino/shared';

const PORT = Number(process.env.BLOCKLYDUINO_SERVICE_PORT ?? 8080);
const HOST = process.env.BLOCKLYDUINO_SERVICE_HOST ?? '127.0.0.1';
const CLI = process.env.ARDUINO_CLI_BIN ?? 'arduino-cli';
const SHOW_SYSTEM_TTY = process.env.BLOCKLYDUINO_SHOW_SYSTEM_TTY === '1';
const SPARKI_DEFAULT_PORT = process.env.SPARKI_PORT ?? '/dev/ttyACM0';
const SPARKI_DEFAULT_BAUD = Number(process.env.SPARKI_BAUD ?? 9600);

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

server.listen(PORT, HOST, () => {
  console.log(`BlocklyDuino Arduino service: http://${HOST}:${PORT}`);
});
