export type {
  BlocklyCommand,
  BlocklyMessage,
  Board,
  AiDetectionResult,
  AiProject,
  AiRuntimeEvent,
  AiSprite,
  CompileRequest,
  PortInfo,
  ServiceEvent,
} from '@blocklyduino/shared';

export type PopupId = 'menu' | 'tools' | 'iot' | null;

export type ModalId = 'board' | 'port' | 'help' | null;
