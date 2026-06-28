import dgram, { type Socket } from 'node:dgram';
import express from 'express';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { WebSocketServer } from 'ws';
import type {
  PhoneControlRequest,
  PhoneRuntimeEvent,
  PhoneSensorEndpoint,
  PhoneSensorReading,
  PhoneSensorStatus,
  PhoneSensorsResponse,
  PhoneUdpControlRequest,
} from '@blocklyduino/shared';
import { SENSAGRAM_DEFAULT_HOST } from '@blocklyduino/shared';

const PORT = Number(process.env.BLOCKLYDUINO_SENSOR_SERVICE_PORT ?? 8070);
const HOST = process.env.BLOCKLYDUINO_SENSOR_SERVICE_HOST ?? '127.0.0.1';
const SENSAGRAM_PORT = Number(process.env.SENSAGRAM_HTTP_PORT ?? 8090);
const UDP_BIND_HOST = process.env.BLOCKLYDUINO_SENSOR_UDP_HOST ?? '0.0.0.0';
const DEFAULT_UDP_PORT = Number(process.env.SENSAGRAM_UDP_BASE_PORT ?? 8080);

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use((_req, res, next) => {
  res.setHeader('access-control-allow-origin', process.env.BLOCKLYDUINO_SENSOR_CORS_ORIGIN ?? '*');
  res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type');
  next();
});
app.options(/.*/, (_req, res) => res.sendStatus(204));

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/phone/events' });
let currentPhoneHost = process.env.SENSAGRAM_HOST ?? SENSAGRAM_DEFAULT_HOST;
const udpSockets = new Map<number, Socket>();

function broadcast(event: PhoneRuntimeEvent) {
  const payload = JSON.stringify(event);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}

function phoneHostFrom(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) {
    return currentPhoneHost;
  }
  currentPhoneHost = value.trim();
  return currentPhoneHost;
}

function sensagramBaseUrl(phoneHost = currentPhoneHost) {
  const host = phoneHost.replace(/\/$/, '');
  if (/^https?:\/\//i.test(host)) {
    return host;
  }
  return `http://${host}:${SENSAGRAM_PORT}`;
}

async function readJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<T>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeEndpoint(endpoint: unknown, fallbackId: string): PhoneSensorEndpoint {
  const data = asRecord(endpoint);
  return {
    id: String(data.id ?? fallbackId),
    name: typeof data.name === 'string' ? data.name : undefined,
    category: typeof data.category === 'string' ? data.category : undefined,
    enabled: typeof data.enabled === 'boolean' ? data.enabled : undefined,
    streaming: typeof data.streaming === 'boolean' ? data.streaming : undefined,
    port: asNumber(data.port),
    hasData: typeof data.hasData === 'boolean' ? data.hasData : undefined,
    api: typeof data.api === 'string' ? data.api : undefined,
    resolution: data.resolution === 'LOW' || data.resolution === 'MEDIUM' || data.resolution === 'HIGH' ? data.resolution : undefined,
    width: asNumber(data.width),
    height: asNumber(data.height),
    intervalMs: asNumber(data.intervalMs),
  };
}

function normalizePorts(payload: unknown) {
  const source = asRecord(asRecord(payload).ports);
  const ports: Record<string, number> = {};
  for (const [key, value] of Object.entries(source)) {
    const port = asNumber(value);
    if (port) {
      ports[key] = port;
    }
  }
  return ports;
}

function extractStatusPayload(payload: unknown) {
  const root = asRecord(payload);
  return root.status && typeof root.status === 'object' ? root.status : payload;
}

function normalizeStatus(payload: unknown, phoneHost = currentPhoneHost): PhoneSensorStatus {
  const source = asRecord(extractStatusPayload(payload));
  const endpointsSource = Array.isArray(source.endpoints) ? source.endpoints : [];
  const endpoints = endpointsSource.map((endpoint, index) => normalizeEndpoint(endpoint, `endpoint-${index}`));
  const endpointPorts = Object.fromEntries(
    endpoints.flatMap((endpoint) => (endpoint.port ? [[endpoint.id, endpoint.port] as const] : [])),
  );
  const ports = { ...normalizePorts(payload), ...normalizePorts(source), ...endpointPorts };
  return {
    ok: true,
    phoneHost,
    baseUrl: sensagramBaseUrl(phoneHost),
    streaming: typeof source.streaming === 'boolean' ? source.streaming : undefined,
    localIp: typeof source.localIp === 'string' ? source.localIp : undefined,
    localHttpPort: asNumber(source.localHttpPort),
    dashboardUrl: typeof source.dashboardUrl === 'string' ? source.dashboardUrl : undefined,
    endpoints,
    ports,
    at: new Date().toISOString(),
    raw: payload,
  };
}

function normalizeReading(payload: unknown, fallbackType: string): PhoneSensorReading {
  const data = asRecord(payload);
  return {
    type: String(data.type ?? fallbackType),
    timestamp: asNumber(data.timestamp),
    values: Array.isArray(data.values) ? data.values.map(Number).filter(Number.isFinite) : undefined,
    latitude: asNumber(data.latitude),
    longitude: asNumber(data.longitude),
    altitude: asNumber(data.altitude),
    bearing: asNumber(data.bearing),
    accuracy: asNumber(data.accuracy),
    speed: asNumber(data.speed),
    time: asNumber(data.time),
    rms: asNumber(data.rms),
    peak: asNumber(data.peak),
    at: new Date().toISOString(),
    raw: payload,
  };
}

function parseSensorValue(value: unknown, key: string) {
  if (typeof value !== 'string') {
    return value && typeof value === 'object' ? { type: key, ...(value as Record<string, unknown>) } : { type: key, values: [Number(value)] };
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' ? { type: key, ...(parsed as Record<string, unknown>) } : { type: key, values: [Number(parsed)] };
  } catch {
    return { type: key, values: [Number(value)] };
  }
}

function normalizeSensors(payload: unknown): PhoneSensorsResponse {
  const root = asRecord(payload);
  const candidates = Array.isArray(payload)
    ? payload
    : Array.isArray(root.readings)
      ? root.readings
      : Array.isArray(root.sensors)
        ? root.sensors
        : root.type
          ? [payload]
          : Object.entries(root).map(([key, value]) => parseSensorValue(value, key));
  return {
    readings: candidates.map((item, index) => normalizeReading(item, `sensor-${index}`)),
    at: new Date().toISOString(),
    raw: payload,
  };
}

async function fetchStatus(phoneHost = currentPhoneHost) {
  const payload = await readJson<unknown>(`${sensagramBaseUrl(phoneHost)}/api/status`);
  const status = normalizeStatus(payload, phoneHost);
  broadcast({ type: 'phoneStatus', connected: true, status });
  return status;
}

function udpPortsFromStatus(status: PhoneSensorStatus) {
  const ports = Object.values(status.ports).filter((port): port is number => Number.isInteger(port) && port > 0 && port < 65536);
  return [...new Set(ports.length ? ports : [DEFAULT_UDP_PORT])];
}

function stopUdpSockets() {
  for (const socket of udpSockets.values()) {
    socket.close();
  }
  udpSockets.clear();
}

function startUdpSockets(ports: number[]) {
  stopUdpSockets();
  for (const port of ports) {
    const socket = dgram.createSocket('udp4');
    socket.on('message', (data) => {
      try {
        const reading = normalizeReading(JSON.parse(data.toString()), `udp-${port}`);
        broadcast({ type: 'phoneSensorData', reading, port, at: new Date().toISOString() });
      } catch (error) {
        broadcast({ type: 'phoneLog', message: `UDP ${port}: ${error instanceof Error ? error.message : String(error)}` });
      }
    });
    socket.on('error', (error) => {
      broadcast({ type: 'phoneLog', message: `UDP ${port}: ${error.message}` });
    });
    socket.bind(port, UDP_BIND_HOST);
    udpSockets.set(port, socket);
  }
  broadcast({ type: 'phoneLog', message: `Écoute UDP capteurs sur ${ports.join(', ')}.` });
}

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'blocklyduino-sensor-service', phoneHost: currentPhoneHost });
});

app.get('/phone/status', async (req, res) => {
  try {
    res.json(await fetchStatus(phoneHostFrom(req.query.phoneHost)));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    broadcast({ type: 'phoneStatus', connected: false, error: message });
    res.status(502).send(message);
  }
});

app.post('/phone/control', async (req, res) => {
  try {
    const body = req.body as PhoneControlRequest;
    const phoneHost = phoneHostFrom(body.phoneHost);
    const { phoneHost: _ignored, ...control } = body;
    const payload = await readJson<unknown>(`${sensagramBaseUrl(phoneHost)}/api/control`, {
      method: 'POST',
      body: JSON.stringify(control),
    });
    res.json({ ok: true, status: normalizeStatus(payload, phoneHost) });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(502).json({ ok: false, error: message });
  }
});

app.get('/phone/sensors', async (req, res) => {
  try {
    const phoneHost = phoneHostFrom(req.query.phoneHost);
    res.json(normalizeSensors(await readJson<unknown>(`${sensagramBaseUrl(phoneHost)}/api/sensors`)));
  } catch (error) {
    res.status(502).send(error instanceof Error ? error.message : String(error));
  }
});

app.get('/phone/gps', async (req, res) => {
  try {
    const phoneHost = phoneHostFrom(req.query.phoneHost);
    res.json(normalizeSensors(await readJson<unknown>(`${sensagramBaseUrl(phoneHost)}/api/gps`)));
  } catch (error) {
    res.status(502).send(error instanceof Error ? error.message : String(error));
  }
});

app.get('/phone/microphone', async (req, res) => {
  try {
    const phoneHost = phoneHostFrom(req.query.phoneHost);
    res.json(normalizeSensors(await readJson<unknown>(`${sensagramBaseUrl(phoneHost)}/api/microphone`)));
  } catch (error) {
    res.status(502).send(error instanceof Error ? error.message : String(error));
  }
});

app.get('/phone/camera.jpg', async (req, res) => {
  try {
    const phoneHost = phoneHostFrom(req.query.phoneHost);
    const response = await fetch(`${sensagramBaseUrl(phoneHost)}/api/camera.jpg`);
    if (!response.ok) {
      res.status(response.status).send(await response.text());
      return;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    res.setHeader('content-type', response.headers.get('content-type') ?? 'image/jpeg');
    res.send(buffer);
  } catch (error) {
    res.status(502).send(error instanceof Error ? error.message : String(error));
  }
});

app.get('/phone/camera.mjpeg', async (req, res) => {
  try {
    const phoneHost = phoneHostFrom(req.query.phoneHost);
    const response = await fetch(`${sensagramBaseUrl(phoneHost)}/api/camera.mjpeg`, {
      bodyTimeout: 0,
      headersTimeout: 30_000,
    } as RequestInit);
    if (!response.ok || !response.body) {
      res.status(response.status || 502).send(response.ok ? 'Flux caméra indisponible.' : await response.text());
      return;
    }
    res.setHeader('content-type', response.headers.get('content-type') ?? 'multipart/x-mixed-replace');
    const upstream = Readable.fromWeb(response.body as never);
    const onStreamError = (error: Error) => {
      if (!res.headersSent) {
        res.status(502).send(error.message);
        return;
      }
      if (!res.writableEnded) {
        res.end();
      }
      upstream.destroy();
    };
    upstream.on('error', onStreamError);
    res.on('close', () => upstream.destroy());
    upstream.pipe(res);
  } catch (error) {
    if (!res.headersSent) {
      res.status(502).send(error instanceof Error ? error.message : String(error));
    }
  }
});

app.post('/phone/udp/start', async (req, res) => {
  try {
    const body = req.body as PhoneUdpControlRequest;
    const phoneHost = phoneHostFrom(body.phoneHost);
    const ports = body.ports?.length ? body.ports : udpPortsFromStatus(await fetchStatus(phoneHost));
    startUdpSockets(ports);
    res.json({ ok: true, ports });
  } catch (error) {
    res.status(502).send(error instanceof Error ? error.message : String(error));
  }
});

app.post('/phone/udp/stop', (_req, res) => {
  stopUdpSockets();
  broadcast({ type: 'phoneLog', message: 'Écoute UDP capteurs arrêtée.' });
  res.json({ ok: true });
});

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'phoneLog', message: 'Service capteurs connecté.' } satisfies PhoneRuntimeEvent));
});

server.listen(PORT, HOST, () => {
  console.log(`Sensor service listening on http://${HOST}:${PORT}`);
});
