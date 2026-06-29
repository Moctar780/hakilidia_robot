import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AI_SERVICE_DEFAULT_URL,
  ARDUINO_SERVICE_DEFAULT_URL,
  BOARDS,
  DEFAULT_AI_PROJECT,
  DEFAULT_CODE,
  PHONE_SENSOR_SERVICE_DEFAULT_URL,
  SENSAGRAM_DEFAULT_HOST,
  boardById,
  createAiClient,
  createSensagramClient,
  createStorageAdapter,
  normalizeDetectionResult,
  resolveServiceUrl,
  type AiDetectionResult,
  type AiInferenceRequest,
  type AiProject,
  type AiSprite,
  type PhoneControlRequest,
  type PhoneControlResponse,
  type PhoneSensorReading,
  type PhoneSensorStatus,
  type PhoneSensorsResponse,
  type PortInfo,
  type SparkiCommandResponse,
} from '../constants';
import type { ModalId, PopupId } from '../types';

type BlocklyActions = {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  newProject: () => void;
  getXml: () => void;
  getXmlAsync: () => Promise<string>;
  loadXml: (xml: string) => void;
  resize: (width?: number, height?: number) => void;
  setBoard: (boardId: string) => void;
  setLanguage: (language: string) => void;
  setTheme: (theme: string) => void;
  setRenderer: (renderer: string) => void;
  toggleCategory: (categoryId: string, enabled: boolean) => void;
  addBlock: (blockType: string, x?: number, y?: number) => void;
  setRenderingConstant: (value: number) => void;
  setAccessibility: (enabled: boolean) => void;
};

type AppContextValue = {
  generatedCode: string;
  setGeneratedCode: (code: string) => void;
  codeReadOnly: boolean;
  setCodeReadOnly: (value: boolean) => void;
  detailedCompilation: boolean;
  setDetailedCompilation: (value: boolean) => void;
  selectedBoardId: string;
  setSelectedBoardId: (id: string) => void;
  selectedPort: string;
  setSelectedPort: (port: string) => void;
  selectedBoardLabel: string;
  workspaceXml: string;
  setWorkspaceXml: (xml: string) => void;
  aiProject: AiProject;
  aiServiceUrl: string;
  setAiServiceUrl: (url: string) => void;
  aiServiceConnected: boolean;
  phoneServiceUrl: string;
  setPhoneServiceUrl: (url: string) => void;
  phoneHost: string;
  setPhoneHost: (host: string) => void;
  phoneConnected: boolean;
  phoneStatus: PhoneSensorStatus | null;
  lastPhoneSensors: PhoneSensorReading[];
  refreshPhoneStatus: (host?: string) => Promise<PhoneSensorStatus>;
  configurePhoneSensors: (request: PhoneControlRequest) => Promise<PhoneControlResponse>;
  readPhoneSensors: () => Promise<PhoneSensorsResponse>;
  readPhoneSensor: (type: string) => Promise<PhoneSensorReading | null>;
  startPhoneUdp: () => Promise<void>;
  stopPhoneUdp: () => Promise<void>;
  getPhoneCameraFrame: () => Promise<string>;
  phoneCameraStreamUrl: string;
  sprites: AiSprite[];
  setSprites: (sprites: AiSprite[] | ((prev: AiSprite[]) => AiSprite[])) => void;
  lastDetection: AiDetectionResult | null;
  setLastDetection: (result: AiDetectionResult | null) => void;
  runtimeStatus: 'idle' | 'running' | 'stopped' | 'error';
  setRuntimeStatus: (status: AppContextValue['runtimeStatus']) => void;
  stopAiProgram: () => void;
  runtimeLogs: string[];
  appendRuntimeLog: (message: string) => void;
  clearRuntimeLogs: () => void;
  activePopup: PopupId;
  setActivePopup: (id: PopupId) => void;
  activeModal: ModalId;
  setActiveModal: (id: ModalId) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  serialOutput: string;
  setSerialOutput: (value: string | ((prev: string) => string)) => void;
  ports: PortInfo[];
  serviceUrl: string;
  setServiceUrl: (url: string) => void;
  serviceConnected: boolean;
  compileStatus: 'idle' | 'running' | 'success' | 'error';
  refreshPorts: () => Promise<void>;
  verifyCode: () => Promise<void>;
  uploadCode: () => Promise<void>;
  sendSparkiCommand: (command: string, expectReply?: boolean) => Promise<SparkiCommandResponse>;
  saveAiProject: () => Promise<void>;
  loadAiProject: (project: AiProject) => void;
  buildCurrentProject: () => AiProject;
  newAiProject: () => void;
  switchAiProject: (index: number) => Promise<void>;
  closeAiProject: (index: number) => void;
  projects: AiProject[];
  activeProjectIndex: number;
  inferWithAi: (request: AiInferenceRequest) => Promise<AiDetectionResult>;
  blockly: BlocklyActions | null;
  setBlocklyActions: (actions: BlocklyActions | null) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [generatedCode, setGeneratedCode] = useState(DEFAULT_CODE);
  const [workspaceXml, setWorkspaceXml] = useState('');
  const [aiProject, setAiProject] = useState<AiProject>(DEFAULT_AI_PROJECT);
  const [projects, setProjects] = useState<AiProject[]>([{ ...DEFAULT_AI_PROJECT, id: 'project-1', name: 'Projet 1' }]);
  const [activeProjectIndex, setActiveProjectIndex] = useState(0);
  const [blockly, setBlocklyActions] = useState<BlocklyActions | null>(null);
  const [sprites, setSprites] = useState<AiSprite[]>(DEFAULT_AI_PROJECT.sprites);

  const newAiProject = useCallback(() => {
    const now = new Date().toISOString();
    const newProject: AiProject = {
      id: `project-${Date.now()}`,
      name: `Projet ${projects.length + 1}`,
      workspaceXml: '',
      runtimeCode: '',
      sprites: [],
      createdAt: now,
      updatedAt: now,
    };
    setProjects((prev) => [...prev, newProject]);
    setActiveProjectIndex(projects.length);
    setAiProject(newProject);
    setWorkspaceXml('');
    setGeneratedCode(DEFAULT_CODE);
    setSprites([]);
    blockly?.newProject();
  }, [projects.length, blockly]);

  const switchAiProject = useCallback(async (index: number) => {
    const project = projects[index];
    if (!project || index === activeProjectIndex) return;
    // Sauvegarder l'état du projet courant dans la liste
    setProjects((prev) => {
      const copy = [...prev];
      if (copy[activeProjectIndex]) {
        copy[activeProjectIndex] = { ...copy[activeProjectIndex], workspaceXml, runtimeCode: generatedCode };
      }
      return copy;
    });
    // Charger le nouveau projet
    setActiveProjectIndex(index);
    setAiProject(project);
    setWorkspaceXml(project.workspaceXml);
    setGeneratedCode(project.runtimeCode || DEFAULT_CODE);
    setSprites(project.sprites);
    if (project.workspaceXml) {
      blockly?.loadXml(project.workspaceXml);
    } else {
      blockly?.newProject();
    }
  }, [projects, activeProjectIndex, workspaceXml, generatedCode, blockly]);

  const closeAiProject = useCallback((index: number) => {
    if (projects.length <= 1) return;
    const newProjects = projects.filter((_, i) => i !== index);
    const newIndex = Math.min(activeProjectIndex, newProjects.length - 1);
    // Si l'index actif change, charger le nouveau projet
    if (newIndex !== activeProjectIndex) {
      const project = newProjects[newIndex];
      setActiveProjectIndex(newIndex);
      setAiProject(project);
      setWorkspaceXml(project.workspaceXml);
      setGeneratedCode(project.runtimeCode || DEFAULT_CODE);
      setSprites(project.sprites);
      if (project.workspaceXml) blockly?.loadXml(project.workspaceXml);
    }
    setProjects(newProjects);
  }, [projects, activeProjectIndex, blockly]);

  const [aiServiceUrl, setAiServiceUrl] = useState(resolveServiceUrl(AI_SERVICE_DEFAULT_URL));
  const [aiServiceConnected, setAiServiceConnected] = useState(false);
  const [phoneServiceUrl, setPhoneServiceUrl] = useState(resolveServiceUrl(PHONE_SENSOR_SERVICE_DEFAULT_URL));
  const [phoneHost, setPhoneHost] = useState(SENSAGRAM_DEFAULT_HOST);
  const [phoneConnected, setPhoneConnected] = useState(false);
  const [phoneStatus, setPhoneStatus] = useState<PhoneSensorStatus | null>(null);
  const [lastPhoneSensors, setLastPhoneSensors] = useState<PhoneSensorReading[]>([]);
  const [lastDetection, setLastDetection] = useState<AiDetectionResult | null>(null);
  const [runtimeStatus, setRuntimeStatus] = useState<AppContextValue['runtimeStatus']>('idle');
  const [runtimeLogs, setRuntimeLogs] = useState<string[]>(['Runtime IA prêt.']);
  const [codeReadOnly, setCodeReadOnly] = useState(false);
  const [detailedCompilation, setDetailedCompilation] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState('arduino_uno');
  const [selectedPort, setSelectedPort] = useState('');
  const [activePopup, setActivePopup] = useState<PopupId>(null);
  const [activeModal, setActiveModal] = useState<ModalId>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [serialOutput, setSerialOutput] = useState('Console série prête...\n');
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const [serviceUrl, setServiceUrl] = useState(resolveServiceUrl(ARDUINO_SERVICE_DEFAULT_URL));
  const [serviceConnected, setServiceConnected] = useState(false);
  const [compileStatus, setCompileStatus] = useState<AppContextValue['compileStatus']>('idle');
  const storage = useMemo(() => createStorageAdapter(window.localStorage), []);
  const aiClient = useMemo(() => createAiClient(aiServiceUrl), [aiServiceUrl]);
  const phoneClient = useMemo(() => createSensagramClient(phoneServiceUrl), [phoneServiceUrl]);

  const appendRuntimeLog = useCallback((message: string) => {
    setRuntimeLogs((prev) => [...prev.slice(-80), `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const clearRuntimeLogs = useCallback(() => setRuntimeLogs([]), []);

  const stopAiProgram = useCallback(() => {
    setRuntimeStatus('stopped');
    appendRuntimeLog('Arrêt demandé.');
  }, [appendRuntimeLog]);

  useEffect(() => {
    const wsUrl = `${serviceUrl.replace(/^http/, 'ws').replace(/\/$/, '')}/events`;
    const socket = new WebSocket(wsUrl);
    socket.onopen = () => setServiceConnected(true);
    socket.onclose = () => setServiceConnected(false);
    socket.onerror = () => setServiceConnected(false);
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data)) as { message?: string; data?: string };
        const text = data.message ?? data.data;
        if (text) {
          setSerialOutput((prev) => `${prev}${text}`);
        }
      } catch {
        setSerialOutput((prev) => `${prev}${String(event.data)}\n`);
      }
    };
    return () => socket.close();
  }, [serviceUrl]);

  useEffect(() => {
    let active = true;
    storage.get('blocklyduino-ai-project').then((raw) => {
      if (!active || !raw) {
        return;
      }
      try {
        const project = JSON.parse(raw) as AiProject;
        setAiProject(project);
        setSprites(project.sprites);
        setWorkspaceXml(project.workspaceXml);
        if (project.runtimeCode) {
          setGeneratedCode(project.runtimeCode);
        }
      } catch {
        appendRuntimeLog('Impossible de relire la sauvegarde locale.');
      }
    });
    return () => {
      active = false;
    };
  }, [appendRuntimeLog, storage]);

  useEffect(() => {
    const socket = aiClient.connectEvents((event) => {
      if (event.type === 'serviceStatus') {
        setAiServiceConnected(event.connected);
      } else if (event.type === 'inferenceResult') {
        /* lastDetection est déjà mis à jour par inferWithAi() — le WebSocket
         * ne fait que logger pour éviter les écritures concurrentes. */
        appendRuntimeLog(`IA: ${event.result.label} (${Math.round(event.result.confidence * 100)} %)`);
      } else if (event.type === 'projectSaved') {
        appendRuntimeLog(`Projet synchronisé: ${event.project.name}`);
      } else if (event.type === 'runtimeLog') {
        appendRuntimeLog(event.message);
      }
    });
    socket.onopen = () => setAiServiceConnected(true);
    socket.onclose = () => setAiServiceConnected(false);
    socket.onerror = () => setAiServiceConnected(false);
    return () => socket.close();
  }, [aiClient, appendRuntimeLog]);

  useEffect(() => {
    const socket = phoneClient.connectEvents((event) => {
      if (event.type === 'phoneStatus') {
        setPhoneConnected(event.connected);
        if (event.status) {
          setPhoneStatus(event.status);
        }
        if (event.error) {
          appendRuntimeLog(`Téléphone: ${event.error}`);
        }
      } else if (event.type === 'phoneSensorData') {
        setLastPhoneSensors((prev) => [event.reading, ...prev.filter((item) => item.type !== event.reading.type)].slice(0, 20));
      } else if (event.type === 'phoneLog') {
        appendRuntimeLog(event.message);
      }
    });
    socket.onopen = () => setPhoneConnected(true);
    socket.onclose = () => setPhoneConnected(false);
    socket.onerror = () => setPhoneConnected(false);
    return () => socket.close();
  }, [appendRuntimeLog, phoneClient]);

  const selectedBoardLabel = useMemo(
    () => BOARDS.find((b) => b.id === selectedBoardId)?.label ?? '...',
    [selectedBoardId],
  );

  async function callService<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${serviceUrl}${path}`, {
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
      ...init,
    });
    setServiceConnected(true);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Service Arduino indisponible (${response.status})`);
    }
    return response.json() as Promise<T>;
  }

  const refreshPorts = async () => {
    try {
      const data = await callService<{ ports: PortInfo[] }>('/ports');
      setPorts(data.ports);
    } catch (error) {
      setServiceConnected(false);
      setSerialOutput((prev) => `${prev}${error instanceof Error ? error.message : String(error)}\n`);
    }
  };

  const runCompileAction = async (path: '/verify/' | '/upload/') => {
    const board = boardById(selectedBoardId);
    setCompileStatus('running');
    setSerialOutput((prev) => `${prev}> ${path === '/verify/' ? 'Vérification' : 'Upload'} ${board.label}\n`);
    try {
      const result = await callService<{ ok: boolean; output: string }>(path, {
        method: 'POST',
        body: JSON.stringify({
          code: generatedCode,
          boardId: board.id,
          fqbn: board.fqbn,
          port: selectedPort,
          detailed: detailedCompilation,
        }),
      });
      setSerialOutput((prev) => `${prev}${result.output}\n`);
      setCompileStatus(result.ok ? 'success' : 'error');
    } catch (error) {
      setCompileStatus('error');
      setServiceConnected(false);
      setSerialOutput((prev) => `${prev}${error instanceof Error ? error.message : String(error)}\n`);
    }
  };

  const verifyCode = () => runCompileAction('/verify/');
  const uploadCode = () => runCompileAction('/upload/');

  const sendSparkiCommand = useCallback(
    async (command: string, expectReply?: boolean) => {
      const result = await callService<SparkiCommandResponse>('/sparki/command', {
        method: 'POST',
        body: JSON.stringify({
          command,
          port: selectedPort || undefined,
          baud: 9600,
          expectReply,
        }),
      });
      setSerialOutput((prev) => `${prev}> Sparki ${command}${result.reply ? ` -> ${result.reply}` : ''}\n`);
      return result;
    },
    [selectedPort, serviceUrl],
  );

  const buildCurrentProject = useCallback((): AiProject => {
    const now = new Date().toISOString();
    return {
      ...aiProject,
      workspaceXml,
      runtimeCode: generatedCode,
      sprites,
      updatedAt: now,
      createdAt: aiProject.createdAt === new Date(0).toISOString() ? now : aiProject.createdAt,
    };
  }, [aiProject, generatedCode, sprites, workspaceXml]);

  useEffect(() => {
    const project = buildCurrentProject();
    storage.set('blocklyduino-ai-project', JSON.stringify(project)).catch(() => {
      appendRuntimeLog('Autosauvegarde locale indisponible.');
    });
  }, [appendRuntimeLog, buildCurrentProject, storage]);

  const saveAiProject = useCallback(async () => {
    // Capture le dernier XML du workspace avant sauvegarde
    try {
      const freshXml = await blockly?.getXmlAsync();
      if (freshXml !== undefined) {
        setWorkspaceXml(freshXml);
      }
    } catch {
      // fallback: utiliser workspaceXml actuel
    }
    const project = buildCurrentProject();
    await storage.set('blocklyduino-ai-project', JSON.stringify(project));
    // Mettre à jour la liste des projets ouverts
    setProjects((prev) => {
      const copy = [...prev];
      if (copy[activeProjectIndex]) {
        copy[activeProjectIndex] = project;
      }
      return copy;
    });
    try {
      const saved = await aiClient.saveProject(project);
      setAiProject(saved);
      setAiServiceConnected(true);
      appendRuntimeLog(`Projet "${saved.name}" sauvegardé.`);
    } catch (error) {
      setAiServiceConnected(false);
      appendRuntimeLog(`Sauvegarde locale uniquement: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [aiClient, appendRuntimeLog, blockly, buildCurrentProject, storage, activeProjectIndex]);

  const loadAiProject = useCallback(
    (project: AiProject) => {
      setAiProject(project);
      setWorkspaceXml(project.workspaceXml);
      setSprites(project.sprites);
      setGeneratedCode(project.runtimeCode || DEFAULT_CODE);
      if (project.workspaceXml) {
        blockly?.loadXml(project.workspaceXml);
      }
      appendRuntimeLog(`Projet "${project.name}" chargé.`);
    },
    [appendRuntimeLog, blockly],
  );

  const inferWithAi = useCallback(
    async (request: AiInferenceRequest) => {
      const result = normalizeDetectionResult(await aiClient.infer(request));
      setAiServiceConnected(true);
      setLastDetection(result);
      return result;
    },
    [aiClient],
  );

  const refreshPhoneStatus = useCallback(async (host?: string) => {
    const targetHost = host?.trim() || phoneHost;
    if (targetHost !== phoneHost) {
      setPhoneHost(targetHost);
    }
    const status = await phoneClient.status(targetHost);
    setPhoneConnected(true);
    setPhoneStatus(status);
    appendRuntimeLog(`Téléphone SensaGram joignable: ${status.dashboardUrl ?? status.baseUrl}`);
    return status;
  }, [appendRuntimeLog, phoneClient, phoneHost]);

  const configurePhoneSensors = useCallback(
    async (request: PhoneControlRequest) => {
      const response = await phoneClient.control({ phoneHost, ...request });
      setPhoneConnected(response.ok);
      if (response.status) {
        setPhoneStatus(response.status);
      }
      appendRuntimeLog(response.ok ? 'Capteurs téléphone configurés.' : `Téléphone: ${response.error ?? 'configuration échouée'}`);
      return response;
    },
    [appendRuntimeLog, phoneClient, phoneHost],
  );

  const readPhoneSensors = useCallback(async () => {
    const response = await phoneClient.sensors(phoneHost);
    setPhoneConnected(true);
    setLastPhoneSensors(response.readings);
    appendRuntimeLog(`${response.readings.length} lecture(s) téléphone reçue(s).`);
    return response;
  }, [appendRuntimeLog, phoneClient, phoneHost]);

  const readPhoneSensor = useCallback(
    async (type: string) => {
      const normalizedType = type.toLowerCase();
      const response =
        normalizedType.includes('gps') || normalizedType === 'android.gps'
          ? await phoneClient.gps(phoneHost)
          : normalizedType.includes('micro')
            ? await phoneClient.microphone(phoneHost)
            : await phoneClient.sensors(phoneHost);
      setPhoneConnected(true);
      setLastPhoneSensors(response.readings);
      return response.readings.find((reading) => reading.type === type || reading.type.toLowerCase().includes(normalizedType)) ?? null;
    },
    [phoneClient, phoneHost],
  );

  const startPhoneUdp = useCallback(async () => {
    const result = await phoneClient.startUdp({ phoneHost });
    setPhoneConnected(true);
    appendRuntimeLog(`UDP téléphone actif sur ${result.ports.join(', ')}.`);
  }, [appendRuntimeLog, phoneClient, phoneHost]);

  const stopPhoneUdp = useCallback(async () => {
    await phoneClient.stopUdp();
    appendRuntimeLog('UDP téléphone arrêté.');
  }, [appendRuntimeLog, phoneClient]);

  const getPhoneCameraFrame = useCallback(async () => phoneClient.cameraSnapshotDataUrl(phoneHost), [phoneClient, phoneHost]);

  const phoneCameraStreamUrl = useMemo(() => phoneClient.cameraStreamUrl(phoneHost), [phoneClient, phoneHost]);

  const value = useMemo<AppContextValue>(
    () => ({
      generatedCode,
      setGeneratedCode,
      workspaceXml,
      setWorkspaceXml,
      aiProject,
      aiServiceUrl,
      setAiServiceUrl,
      aiServiceConnected,
      phoneServiceUrl,
      setPhoneServiceUrl,
      phoneHost,
      setPhoneHost,
      phoneConnected,
      phoneStatus,
      lastPhoneSensors,
      refreshPhoneStatus,
      configurePhoneSensors,
      readPhoneSensors,
      readPhoneSensor,
      startPhoneUdp,
      stopPhoneUdp,
      getPhoneCameraFrame,
      phoneCameraStreamUrl,
      sprites,
      setSprites,
      lastDetection,
      setLastDetection,
      runtimeStatus,
      setRuntimeStatus,
      stopAiProgram,
      runtimeLogs,
      appendRuntimeLog,
      clearRuntimeLogs,
      codeReadOnly,
      setCodeReadOnly,
      detailedCompilation,
      setDetailedCompilation,
      selectedBoardId,
      setSelectedBoardId,
      selectedPort,
      setSelectedPort,
      selectedBoardLabel,
      activePopup,
      setActivePopup,
      activeModal,
      setActiveModal,
      settingsOpen,
      setSettingsOpen,
      serialOutput,
      setSerialOutput,
      ports,
      serviceUrl,
      setServiceUrl,
      serviceConnected,
      compileStatus,
      refreshPorts,
      verifyCode,
      uploadCode,
      sendSparkiCommand,
      saveAiProject,
      loadAiProject,
      buildCurrentProject,
      newAiProject,
      switchAiProject,
      closeAiProject,
      projects,
      activeProjectIndex,
      inferWithAi,
      blockly,
      setBlocklyActions,
    }),
    [
      generatedCode,
      workspaceXml,
      aiProject,
      aiServiceUrl,
      aiServiceConnected,
      phoneServiceUrl,
      phoneHost,
      phoneConnected,
      phoneStatus,
      lastPhoneSensors,
      refreshPhoneStatus,
      configurePhoneSensors,
      readPhoneSensors,
      readPhoneSensor,
      startPhoneUdp,
      stopPhoneUdp,
      getPhoneCameraFrame,
      phoneCameraStreamUrl,
      sprites,
      lastDetection,
      runtimeStatus,
      stopAiProgram,
      runtimeLogs,
      appendRuntimeLog,
      clearRuntimeLogs,
      codeReadOnly,
      detailedCompilation,
      selectedBoardId,
      selectedPort,
      selectedBoardLabel,
      activePopup,
      activeModal,
      settingsOpen,
      serialOutput,
      ports,
      serviceUrl,
      serviceConnected,
      compileStatus,
      sendSparkiCommand,
      saveAiProject,
      loadAiProject,
      buildCurrentProject,
      newAiProject,
      switchAiProject,
      closeAiProject,
      projects,
      activeProjectIndex,
      inferWithAi,
      blockly,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp doit être utilisé dans AppProvider');
  }
  return ctx;
}
