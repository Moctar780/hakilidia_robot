import express from 'express';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import type {
  AiDetectionKind,
  AiDetectionResult,
  AiInferenceRequest,
  AiProject,
  AiRuntimeEvent,
  AiUser,
} from '@blocklyduino/shared';
import { DEFAULT_AI_PROJECT, DEFAULT_AI_USER } from '@blocklyduino/shared';
import { validateImage } from './validate.js';

const PORT = Number(process.env.BLOCKLYDUINO_AI_SERVICE_PORT ?? 8090);
const HOST = process.env.BLOCKLYDUINO_AI_SERVICE_HOST ?? '127.0.0.1';
const DATA_DIR = process.env.BLOCKLYDUINO_AI_DATA_DIR ?? path.join(process.cwd(), '.blocklyduino-ai');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PYTHON_BIN = process.env.BLOCKLYDUINO_AI_PYTHON ?? '/home/moctar/python_env/ai_env/bin/python';
const YOLO_TIMEOUT_MS = Number(process.env.BLOCKLYDUINO_YOLO_TIMEOUT_MS ?? 20_000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json({ limit: '4mb' }));
app.use((_req, res, next) => {
  res.setHeader('access-control-allow-origin', process.env.BLOCKLYDUINO_AI_CORS_ORIGIN ?? '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
  next();
});
app.options(/.*/, (_req, res) => res.sendStatus(204));

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/events' });

function broadcast(event: AiRuntimeEvent) {
  const payload = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload, () => undefined);
    }
  }
}

async function readProjects(): Promise<AiProject[]> {
  try {
    const raw = await readFile(PROJECTS_FILE, 'utf8');
    return JSON.parse(raw) as AiProject[];
  } catch {
    return [];
  }
}

async function writeProjects(projects: AiProject[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(PROJECTS_FILE, JSON.stringify(projects, null, 2), 'utf8');
}

async function readUsers(): Promise<AiUser[]> {
  try {
    const raw = await readFile(USERS_FILE, 'utf8');
    return JSON.parse(raw) as AiUser[];
  } catch {
    return [DEFAULT_AI_USER];
  }
}

async function writeUsers(users: AiUser[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

function normalizeProject(project: AiProject): AiProject {
  const now = new Date().toISOString();
  const createdAt = project.createdAt && project.createdAt !== new Date(0).toISOString() ? project.createdAt : now;
  return {
    ...DEFAULT_AI_PROJECT,
    ...project,
    id: project.id || `project-${Date.now()}`,
    name: project.name || 'Projet Blockly IA',
    sprites: project.sprites?.length ? project.sprites : DEFAULT_AI_PROJECT.sprites,
    createdAt,
    updatedAt: now,
  };
}

function heuristicInference(kind: AiDetectionKind): AiDetectionResult {
  if (kind === 'line') {
    console.log('[heuristicInference] Suivi de ligne: service IA indisponible, arrêt de sécurité.');
    return {
      kind,
      label: 'perdue',
      confidence: 0,
      offset: 0,
      at: new Date().toISOString(),
    };
  }

  const labels: Record<Exclude<AiDetectionKind, 'line'>, string[]> = {
    face: ['visage detecte', 'aucun visage', 'visage proche'],
    object: ['robot', 'main', 'carte Arduino', 'objet inconnu'],
    gender: ['personne', 'profil non determine'],
  };
  const pool = labels[kind as Exclude<AiDetectionKind, 'line'>] ?? labels.object;
  const label = pool[Math.floor(Math.random() * pool.length)] ?? 'objet inconnu';
  const confidence = Number((0.72 + Math.random() * 0.25).toFixed(2));
  return {
    kind,
    label,
    confidence,
    at: new Date().toISOString(),
  };
}

function resolveScriptPath(envVar: string | undefined, filename: string, label: string) {
  const candidates = [
    envVar,
    path.join(__dirname, filename),
    path.join(process.cwd(), 'src', filename),
    path.join(process.cwd(), 'packages', 'ai-service', 'src', filename),
  ].filter(Boolean) as string[];
  const script = candidates.find((candidate) => existsSync(candidate));
  if (!script) {
    throw new Error(`Script ${label} introuvable.`);
  }
  return script;
}

function yoloScriptPath() {
  return resolveScriptPath(process.env.BLOCKLYDUINO_YOLO_SCRIPT, 'yolo_infer.py', 'YOLO');
}

function lineScriptPath() {
  return resolveScriptPath(process.env.BLOCKLYDUINO_LINE_SCRIPT, 'line_follow.py', 'suivi de ligne');
}

function runPythonInference(scriptPath: string, request: AiInferenceRequest): Promise<AiDetectionResult> {
  return new Promise((resolve, reject) => {
    if (!request.imageDataUrl) {
      reject(new Error('Aucune image caméra à analyser.'));
      return;
    }

    const child = spawn(PYTHON_BIN, [scriptPath], {
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      shell: false,
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Inférence Python a dépassé ${YOLO_TIMEOUT_MS} ms.`));
    }, YOLO_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(stderr || `Script Python terminé avec le code ${code}.`));
        return;
      }
      try {
        const lines = stdout.trim().split('\n').filter(Boolean);
        const payload = lines[lines.length - 1];
        if (!payload) {
          throw new Error('Réponse Python vide.');
        }
        resolve(JSON.parse(payload) as AiDetectionResult);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
    if (child.stdin) {
      child.stdin.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code !== 'EPIPE') {
          clearTimeout(timer);
          reject(error);
        }
      });
      child.stdin.end(JSON.stringify(request));
    } else {
      clearTimeout(timer);
      reject(new Error('Entrée Python indisponible.'));
    }
  });
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'blocklyduino-ai-service',
    python: PYTHON_BIN,
    yolo: {
      scriptAvailable: (() => {
        try {
          yoloScriptPath();
          return true;
        } catch {
          return false;
        }
      })(),
    },
    lineFollow: {
      scriptAvailable: (() => {
        try {
          lineScriptPath();
          return true;
        } catch {
          return false;
        }
      })(),
    },
  });
});

app.get('/session', (_req, res) => {
  res.json(DEFAULT_AI_USER);
});

app.get('/users', async (_req, res) => {
  res.json({ users: await readUsers() });
});

app.put('/users/:id', async (req, res) => {
  const incoming = {
    ...DEFAULT_AI_USER,
    ...(req.body as AiUser),
    id: req.params.id,
  };
  const users = await readUsers();
  const index = users.findIndex((item) => item.id === incoming.id);
  if (index >= 0) {
    users[index] = incoming;
  } else {
    users.push(incoming);
  }
  await writeUsers(users);
  res.json(incoming);
});

app.get('/projects', async (_req, res) => {
  res.json({ projects: await readProjects() });
});

app.get('/projects/:id', async (req, res) => {
  const project = (await readProjects()).find((item) => item.id === req.params.id);
  if (!project) {
    res.status(404).send('Projet introuvable.');
    return;
  }
  res.json(project);
});

app.put('/projects/:id', async (req, res) => {
  const incoming = normalizeProject({ ...(req.body as AiProject), id: req.params.id });
  const projects = await readProjects();
  const index = projects.findIndex((item) => item.id === incoming.id);
  if (index >= 0) {
    projects[index] = incoming;
  } else {
    projects.push(incoming);
  }
  await writeProjects(projects);
  broadcast({ type: 'projectSaved', project: incoming });
  res.json(incoming);
});

app.post('/ai/infer', async (req, res) => {
  const body = req.body as AiInferenceRequest;
  const kind = body.kind ?? 'object';

  // Validation de l'image avant toute tentative d'inférence
  if (body.imageDataUrl) {
    if (body.imageDataUrl.length > 3_500_000) {
      res.status(413).send('Image trop volumineuse pour le service IA.');
      return;
    }
    try {
      await validateImage(body.imageDataUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.status(400).send(`Image invalide: ${message}`);
      return;
    }
  }

  let result: AiDetectionResult;
  const scriptPath = kind === 'line' ? lineScriptPath() : yoloScriptPath();
  try {
    result = await runPythonInference(scriptPath, { ...body, kind });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const engine = kind === 'line' ? 'Suivi de ligne' : 'YOLO';
    broadcast({ type: 'runtimeLog', message: `${engine} indisponible, fallback simulé: ${message}` });
    result = heuristicInference(kind);
  }
  broadcast({ type: 'inferenceResult', result });
  res.json(result);
});

wss.on('connection', (socket) => {
  socket.on('error', () => undefined);
  socket.send(JSON.stringify({ type: 'serviceStatus', connected: true } satisfies AiRuntimeEvent));
});

server.listen(PORT, HOST, () => {
  console.log(`BlocklyDuino AI service: http://${HOST}:${PORT}`);
});
