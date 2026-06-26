export type Board = {
  id: string;
  label: string;
  fqbn: string;
  connect?: string;
  voltage?: string;
  cpu?: string;
  speed?: string;
};

export const BOARDS: Board[] = [
  { id: 'arduino_leonardo', label: 'Arduino Léonardo', fqbn: 'arduino:avr:leonardo' },
  { id: 'arduino_mega', label: 'Arduino Mega', fqbn: 'arduino:avr:mega' },
  { id: 'arduino_micro', label: 'Arduino Micro', fqbn: 'arduino:avr:micro' },
  { id: 'arduino_mini', label: 'Arduino Mini', fqbn: 'arduino:avr:mini' },
  { id: 'arduino_nano', label: 'Arduino Nano', fqbn: 'arduino:avr:nano' },
  { id: 'arduino_pro8', label: 'Arduino Pro Mini 3.3V', fqbn: 'arduino:avr:pro:cpu=8MHzatmega328' },
  { id: 'arduino_pro16', label: 'Arduino Pro Mini 5V', fqbn: 'arduino:avr:pro:cpu=16MHzatmega328' },
  { id: 'arduino_uno', label: 'Arduino Uno', fqbn: 'arduino:avr:uno' },
  { id: 'arduino_yun', label: 'Arduino Yùn', fqbn: 'arduino:avr:yun' },
  { id: 'lilypad', label: 'LilyPad', fqbn: 'arduino:avr:lilypad' }
];

export const DEFAULT_CODE = `// BlocklyDuino - code généré
void setup() {
}

void loop() {
}
`;

export type BlocklyCommand =
  | { command: 'undo' }
  | { command: 'redo' }
  | { command: 'clear' }
  | { command: 'getXml' }
  | { command: 'loadXml'; xml: string }
  | { command: 'resize'; width?: number; height?: number }
  | { command: 'setBoard'; boardId: string }
  | { command: 'setLanguage'; language: string }
  | { command: 'setTheme'; theme: string }
  | { command: 'setRenderer'; renderer: string }
  | { command: 'toggleCategory'; categoryId: string; enabled: boolean }
  | { command: 'setRenderingConstant'; value: number }
  | { command: 'setAccessibility'; enabled: boolean }
  | { command: 'newProject' };

export type BlocklyMessage =
  | { source: 'blocklyduino-workspace'; type: 'ready' }
  | { source: 'blocklyduino-workspace'; type: 'code'; code: string }
  | { source: 'blocklyduino-workspace'; type: 'xml'; xml: string }
  | { source: 'blocklyduino-workspace'; type: 'xmlSnapshot'; xml: string }
  | { source: 'blocklyduino-workspace'; type: 'error'; message: string }
  | { source: 'blocklyduino-workspace'; type: 'boardChanged'; boardId: string };

export type CompileRequest = {
  code: string;
  boardId: string;
  fqbn: string;
  port?: string;
  detailed?: boolean;
};

export type SparkiCommandRequest = {
  command: string;
  port?: string;
  baud?: number;
  expectReply?: boolean;
};

export type SparkiCommandResponse = {
  ok: boolean;
  command: string;
  port: string;
  reply?: string;
  error?: string;
};

export type PortInfo = {
  address: string;
  label: string;
  protocol?: string;
};

export type ServiceEvent =
  | { type: 'serviceStatus'; connected: boolean }
  | { type: 'compileOutput'; message: string }
  | { type: 'compileError'; message: string }
  | { type: 'uploadProgress'; message: string }
  | { type: 'serialData'; data: string };

export const ARDUINO_SERVICE_DEFAULT_URL = 'http://127.0.0.1:8080';
export const AI_SERVICE_DEFAULT_URL = 'http://127.0.0.1:8090';
export const BLOCKLY_WORKSPACE_URL = '/blockly-static/workspace.html';

export type AiSprite = {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: number;
  size: number;
  costume: 'robot' | 'cat' | 'rocket';
  visible: boolean;
};

export type AiUser = {
  id: string;
  name: string;
  role: 'teacher' | 'learner' | 'guest';
};

export type AiProject = {
  id: string;
  name: string;
  ownerId?: string;
  workspaceXml: string;
  runtimeCode: string;
  sprites: AiSprite[];
  createdAt: string;
  updatedAt: string;
};

export type AiDetectionKind = 'face' | 'object' | 'gender';

export type AiDetectionResult = {
  kind: AiDetectionKind;
  label: string;
  confidence: number;
  at: string;
};

export type AiInferenceRequest = {
  kind: AiDetectionKind;
  imageDataUrl?: string;
};

export type AiRuntimeEvent =
  | { type: 'serviceStatus'; connected: boolean }
  | { type: 'projectSaved'; project: AiProject }
  | { type: 'inferenceResult'; result: AiDetectionResult }
  | { type: 'runtimeLog'; message: string };

export const DEFAULT_AI_SPRITE: AiSprite = {
  id: 'sprite-robot',
  name: 'Hakili',
  x: 0,
  y: 0,
  direction: 90,
  size: 100,
  costume: 'robot',
  visible: true,
};

export const DEFAULT_AI_USER: AiUser = {
  id: 'guest',
  name: 'Invité',
  role: 'guest',
};

export const DEFAULT_AI_PROJECT: AiProject = {
  id: 'local-project',
  name: 'Projet Blockly IA',
  ownerId: DEFAULT_AI_USER.id,
  workspaceXml: '',
  runtimeCode: '',
  sprites: [DEFAULT_AI_SPRITE],
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

export function boardById(boardId: string) {
  return BOARDS.find((board) => board.id === boardId) ?? BOARDS.find((board) => board.id === 'arduino_uno') ?? BOARDS[0];
}

export { createArduinoClient } from './arduinoClient.js';
export type { ArduinoClient } from './arduinoClient.js';
export { createAiClient } from './aiClient.js';
export type { AiClient } from './aiClient.js';
export { createStorageAdapter } from './persistence.js';
export type { StorageAdapter } from './persistence.js';
