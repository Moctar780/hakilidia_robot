import type {
  PhoneControlRequest,
  PhoneControlResponse,
  PhoneRuntimeEvent,
  PhoneSensorStatus,
  PhoneSensorsResponse,
  PhoneUdpControlRequest,
} from './index.js';

export type SensagramClient = {
  health: () => Promise<boolean>;
  status: (phoneHost?: string) => Promise<PhoneSensorStatus>;
  control: (request: PhoneControlRequest) => Promise<PhoneControlResponse>;
  sensors: (phoneHost?: string) => Promise<PhoneSensorsResponse>;
  gps: (phoneHost?: string) => Promise<PhoneSensorsResponse>;
  microphone: (phoneHost?: string) => Promise<PhoneSensorsResponse>;
  startUdp: (request?: PhoneUdpControlRequest) => Promise<{ ok: boolean; ports: number[] }>;
  stopUdp: () => Promise<{ ok: boolean }>;
  cameraSnapshotUrl: (phoneHost?: string) => string;
  cameraStreamUrl: (phoneHost?: string) => string;
  cameraSnapshotDataUrl: (phoneHost?: string) => Promise<string>;
  connectEvents: (onEvent: (event: PhoneRuntimeEvent) => void) => WebSocket;
};

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<T>;
}

function withPhoneHost(path: string, phoneHost?: string) {
  if (!phoneHost) {
    return path;
  }
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}phoneHost=${encodeURIComponent(phoneHost)}`;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Lecture image téléphone impossible.'));
    reader.readAsDataURL(blob);
  });
}

export function createSensagramClient(baseUrl: string): SensagramClient {
  const normalized = baseUrl.replace(/\/$/, '');
  return {
    health: async () => {
      try {
        const result = await jsonRequest<{ ok: boolean }>(`${normalized}/health`);
        return result.ok;
      } catch {
        return false;
      }
    },
    status: (phoneHost) => jsonRequest(`${normalized}${withPhoneHost('/phone/status', phoneHost)}`),
    control: (request) =>
      jsonRequest(`${normalized}/phone/control`, {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    sensors: (phoneHost) => jsonRequest(`${normalized}${withPhoneHost('/phone/sensors', phoneHost)}`),
    gps: (phoneHost) => jsonRequest(`${normalized}${withPhoneHost('/phone/gps', phoneHost)}`),
    microphone: (phoneHost) => jsonRequest(`${normalized}${withPhoneHost('/phone/microphone', phoneHost)}`),
    startUdp: (request = {}) =>
      jsonRequest(`${normalized}/phone/udp/start`, {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    stopUdp: () =>
      jsonRequest(`${normalized}/phone/udp/stop`, {
        method: 'POST',
        body: JSON.stringify({}),
      }),
    cameraSnapshotUrl: (phoneHost) => `${normalized}${withPhoneHost('/phone/camera.jpg', phoneHost)}`,
    cameraStreamUrl: (phoneHost) => `${normalized}${withPhoneHost('/phone/camera.mjpeg', phoneHost)}`,
    cameraSnapshotDataUrl: async (phoneHost) => {
      const response = await fetch(`${normalized}${withPhoneHost('/phone/camera.jpg', phoneHost)}`);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return blobToDataUrl(await response.blob());
    },
    connectEvents: (onEvent) => {
      const socket = new WebSocket(`${normalized.replace(/^http/, 'ws')}/phone/events`);
      socket.onmessage = (message) => onEvent(JSON.parse(String(message.data)) as PhoneRuntimeEvent);
      return socket;
    },
  };
}
