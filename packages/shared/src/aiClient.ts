import type {
  AiDetectionResult,
  AiInferenceRequest,
  AiProject,
  AiRuntimeEvent,
  AiUser,
} from './index.js';

export type AiClient = {
  health: () => Promise<boolean>;
  session: () => Promise<AiUser>;
  listProjects: () => Promise<AiProject[]>;
  getProject: (id: string) => Promise<AiProject>;
  saveProject: (project: AiProject) => Promise<AiProject>;
  infer: (request: AiInferenceRequest) => Promise<AiDetectionResult>;
  connectEvents: (onEvent: (event: AiRuntimeEvent) => void) => WebSocket;
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

export function createAiClient(baseUrl: string): AiClient {
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
    session: () => jsonRequest(`${normalized}/session`),
    listProjects: async () => {
      const result = await jsonRequest<{ projects: AiProject[] }>(`${normalized}/projects`);
      return result.projects;
    },
    getProject: (id) => jsonRequest(`${normalized}/projects/${encodeURIComponent(id)}`),
    saveProject: (project) =>
      jsonRequest(`${normalized}/projects/${encodeURIComponent(project.id)}`, {
        method: 'PUT',
        body: JSON.stringify(project),
      }),
    infer: (request) =>
      jsonRequest(`${normalized}/ai/infer`, {
        method: 'POST',
        body: JSON.stringify(request),
      }),
    connectEvents: (onEvent) => {
      const socket = new WebSocket(`${normalized.replace(/^http/, 'ws')}/events`);
      socket.onmessage = (message) => onEvent(JSON.parse(String(message.data)) as AiRuntimeEvent);
      return socket;
    },
  };
}
