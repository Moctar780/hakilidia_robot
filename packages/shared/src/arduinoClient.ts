import type { CompileRequest, PortInfo, ServiceEvent, SparkiCommandRequest, SparkiCommandResponse } from './index.js';

export type ArduinoClient = {
  health: () => Promise<boolean>;
  ports: () => Promise<PortInfo[]>;
  verify: (request: CompileRequest) => Promise<{ ok: boolean; output: string }>;
  upload: (request: CompileRequest) => Promise<{ ok: boolean; output: string }>;
  sparkiCommand: (request: SparkiCommandRequest) => Promise<SparkiCommandResponse>;
  connectEvents: (onEvent: (event: ServiceEvent) => void) => WebSocket;
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

export function createArduinoClient(baseUrl: string): ArduinoClient {
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
    ports: async () => {
      const result = await jsonRequest<{ ports: PortInfo[] }>(`${normalized}/ports`);
      return result.ports;
    },
    verify: (request) =>
      jsonRequest(`${normalized}/verify/`, {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    upload: (request) =>
      jsonRequest(`${normalized}/upload/`, {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    sparkiCommand: (request) =>
      jsonRequest(`${normalized}/sparki/command`, {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    connectEvents: (onEvent) => {
      const wsUrl = normalized.replace(/^http/, 'ws') + '/events';
      const socket = new WebSocket(wsUrl);
      socket.onmessage = (message) => onEvent(JSON.parse(String(message.data)) as ServiceEvent);
      return socket;
    },
  };
}
