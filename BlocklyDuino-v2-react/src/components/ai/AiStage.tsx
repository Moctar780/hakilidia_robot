import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { runAiProgram } from '../../runtime/aiRuntime';
import type { AiDetectionKind, AiDetectionResult } from '../../constants';
import './AiStage.css';

function fallbackDetection(kind: AiDetectionKind): AiDetectionResult {
  if (kind === 'line') {
    return {
      kind,
      label: 'centre',
      confidence: 0.5,
      offset: 0,
      at: new Date().toISOString(),
    };
  }
  const label = kind === 'face' ? 'visage detecte' : kind === 'gender' ? 'personne' : 'robot';
  return {
    kind,
    label,
    confidence: 0.76,
    at: new Date().toISOString(),
  };
}

function DetectionBox({ result }: { result: AiDetectionResult | null }) {
  if (!result?.box || result.confidence <= 0) {
    return null;
  }
  const box = result.box;
  return (
    <div
      className="ai-stage__detection-box"
      style={{
        left: `${box.x * 100}%`,
        top: `${box.y * 100}%`,
        width: `${box.width * 100}%`,
        height: `${box.height * 100}%`,
      }}
    >
      <span>
        {box.label ?? result.label} {Math.round((box.confidence ?? result.confidence) * 100)}%
      </span>
    </div>
  );
}

export function AiStage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopRequested = useRef(false);
  const [overlayDetectionKind, setOverlayDetectionKind] = useState<AiDetectionKind | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [usePhoneCamera, setUsePhoneCamera] = useState(false);
  const [cameraPreviewOpen, setCameraPreviewOpen] = useState(false);
  const [, setSpeech] = useState('Prêt à exécuter les blocs IA.');
  const {
    generatedCode,
    setSprites,
    lastDetection,
    setLastDetection,
    runtimeStatus,
    setRuntimeStatus,
    simulatorMode,
    runtimeLogs,
    appendRuntimeLog,
    clearRuntimeLogs,
    inferWithAi,
    aiServiceConnected,
    sendSparkiCommand,
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
    saveAiProject,
  } = useApp();

  const refreshCameraDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setCameraError('API caméra indisponible dans ce navigateur.');
      return;
    }
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter((device) => device.kind === 'videoinput');
    setCameraDevices(videoInputs);
    setSelectedCameraId((current) => current || videoInputs[0]?.deviceId || '');
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshCameraDevices().catch((error) => {
        setCameraError(error instanceof Error ? error.message : String(error));
      });
    }, 0);
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshCameraDevices);
    return () => {
      window.clearTimeout(timer);
      navigator.mediaDevices?.removeEventListener?.('devicechange', refreshCameraDevices);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
    if (previewVideoRef.current && cameraStream) {
      previewVideoRef.current.srcObject = cameraStream;
    }
  }, [cameraPreviewOpen, cameraStream]);

  useEffect(
    () => () => {
      cameraStream?.getTracks().forEach((track) => track.stop());
    },
    [cameraStream],
  );

  const openCamera = async () => {
    if (cameraStream) {
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Caméra indisponible dans ce navigateur.');
    }
    setCameraError('');
    const videoConstraints: MediaTrackConstraints = selectedCameraId
      ? { deviceId: { exact: selectedCameraId }, width: { ideal: 640 }, height: { ideal: 480 } }
      : { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } };
    const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
    setCameraStream(stream);
    await refreshCameraDevices();
    const activeDeviceId = stream.getVideoTracks()[0]?.getSettings().deviceId;
    if (activeDeviceId) {
      setSelectedCameraId(activeDeviceId);
    }
  };

  const closeCamera = () => {
    cameraStream?.getTracks().forEach((track) => track.stop());
    setCameraStream(null);
  };

  const changeCameraSource = async (deviceId: string) => {
    setSelectedCameraId(deviceId);
    if (!cameraStream) {
      return;
    }
    closeCamera();
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setCameraStream(stream);
      appendRuntimeLog('Source caméra changée.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setCameraError(message);
      appendRuntimeLog(`Caméra indisponible: ${message}`);
    }
  };

  const findReadyVideo = () =>
    [videoRef.current, previewVideoRef.current].find((node) => node && node.videoWidth > 0);

  const waitForVideoReady = async (timeoutMs = 3000): Promise<boolean> => {
    if (findReadyVideo()) {
      return true;
    }
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (findReadyVideo()) {
          resolve(true);
          return;
        }
        if (Date.now() - start >= timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(check, 100);
      };
      check();
    });
  };

  const captureFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const video = findReadyVideo();
    if (!video) {
      return undefined;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.78);
  };

  const detect = async (kind: AiDetectionKind) => {
    setOverlayDetectionKind(kind);
    const imageDataUrl = usePhoneCamera
      ? await getPhoneCameraFrame()
      : (await waitForVideoReady()) && captureFrame();
    if (!imageDataUrl) {
      appendRuntimeLog(`Détection ${kind}: aucune image disponible.`);
      const result = fallbackDetection(kind);
      setLastDetection(result);
      return result;
    }
    try {
      const result = await inferWithAi({ kind, imageDataUrl });
      // inferWithAi normalise déjà le résultat et met à jour lastDetection
      appendRuntimeLog(`Détection ${kind}: ${result.label}`);
      return result;
    } catch {
      const result = fallbackDetection(kind);
      setLastDetection(result);
      appendRuntimeLog(`Détection locale simulée: ${result.label}`);
      return result;
    }
  };

  useEffect(() => {
    if (!cameraPreviewOpen) {
      return;
    }
    if (!overlayDetectionKind || overlayDetectionKind === 'line') {
      return;
    }
    const kind = overlayDetectionKind;
    let cancelled = false;
    const refreshOverlay = async () => {
      if (cancelled || stopRequested.current) {
        return;
      }
      const imageDataUrl = usePhoneCamera
        ? await getPhoneCameraFrame()
        : (await waitForVideoReady(1500)) && captureFrame();
      if (!imageDataUrl || cancelled) {
        return;
      }
      try {
        // inferWithAi normalise déjà le résultat et met à jour lastDetection
        await inferWithAi({ kind, imageDataUrl });
      } catch {
        if (!cancelled) {
          setLastDetection(fallbackDetection(kind));
        }
      }
    };
    void refreshOverlay();
    const timer = window.setInterval(refreshOverlay, 900);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [cameraPreviewOpen, overlayDetectionKind, usePhoneCamera, cameraStream, phoneConnected, getPhoneCameraFrame, inferWithAi, setLastDetection]);

  // Réagit aux arrêts externes (Header, RightPanel, raccourcis clavier)
  useEffect(() => {
    if (runtimeStatus === 'stopped') {
      stopRequested.current = true;
    }
  }, [runtimeStatus]);

  const runProgram = async () => {
    stopRequested.current = false;
    setRuntimeStatus('running');
    clearRuntimeLogs();
    appendRuntimeLog(simulatorMode ? 'Démarrage du simulateur.' : 'Démarrage du programme IA.');
    try {
      await runAiProgram(generatedCode, {
        openCamera,
        closeCamera,
        detect,
        updateSprite: (updater) => {
          setSprites((prev) => {
            const [first, ...rest] = prev;
            return first ? [updater(first), ...rest] : prev;
          });
        },
        // En mode simulateur, les commandes robot ne font que logger
        sendRobotCommand: simulatorMode
          ? async (cmd: string) => { appendRuntimeLog(`[Simulateur] ${cmd}`); }
          : sendSparkiCommand,
        connectPhone: refreshPhoneStatus,
        configurePhoneSensors,
        readPhoneSensor,
        startPhoneUdp,
        stopPhoneUdp,
        usePhoneCamera: setUsePhoneCamera,
        openCameraPreview: () => setCameraPreviewOpen(true),
        say: setSpeech,
        log: appendRuntimeLog,
        shouldStop: () => stopRequested.current,
      });
      setRuntimeStatus(stopRequested.current ? 'stopped' : 'idle');
    } catch (error) {
      setRuntimeStatus('error');
      appendRuntimeLog(error instanceof Error ? error.message : String(error));
    }
  };

  const stopProgram = () => {
    stopRequested.current = true;
    setOverlayDetectionKind(null);
    setRuntimeStatus('stopped');
    appendRuntimeLog('Arrêt demandé.');
  };

  useEffect(() => {
    const handleGlobalRun = () => {
      if (runtimeStatus !== 'running') {
        void runProgram();
      }
    };
    window.addEventListener('blocklyduino:run-ai-program', handleGlobalRun);
    return () => window.removeEventListener('blocklyduino:run-ai-program', handleGlobalRun);
  }, [runtimeStatus, runProgram]);

  return (
    <aside className="ai-stage">
      <div className="ai-stage__header">
        <div>
          <strong>Scène IA</strong>
          <span>{aiServiceConnected ? 'Service IA connecté' : 'Mode local/simulé'}</span>
        </div>
        <div className="ai-stage__actions">
          <button type="button" className="ai-stage__action ai-stage__action--run" onClick={runProgram} disabled={runtimeStatus === 'running'}>
            Exécuter
          </button>
          <button type="button" className="ai-stage__action ai-stage__action--stop" onClick={stopProgram}>
            Arrêter
          </button>
          <button type="button" className="ai-stage__action ai-stage__action--save" onClick={saveAiProject}>
            Sauvegarder
          </button>
        </div>
      </div>

      <div className="ai-stage__connection">
        <span className={aiServiceConnected ? 'ai-stage__dot ai-stage__dot--online' : 'ai-stage__dot'} />
        {aiServiceConnected ? 'Service IA connecté' : 'Service IA local'}
      </div>

      <div className="ai-stage__camera-controls">
        <label>
          Source caméra
          <select value={selectedCameraId} onChange={(event) => changeCameraSource(event.target.value)}>
            {cameraDevices.length === 0 && <option value="">Webcam par défaut</option>}
            {cameraDevices.map((device, index) => (
              <option key={device.deviceId || index} value={device.deviceId}>
                {device.label || `Caméra ${index + 1}`}
              </option>
            ))}
          </select>
        </label>
        <div className="ai-stage__camera-buttons">
          <button type="button" onClick={openCamera} disabled={Boolean(cameraStream)}>
            Ouvrir caméra
          </button>
          <button type="button" onClick={closeCamera} disabled={!cameraStream}>
            Fermer
          </button>
          <button
            type="button"
            onClick={() =>
              refreshCameraDevices().catch((error) => {
                setCameraError(error instanceof Error ? error.message : String(error));
              })
            }
          >
            Rafraîchir
          </button>
          <button type="button" onClick={() => setCameraPreviewOpen(true)}>
            Fenêtre caméra
          </button>
        </div>
        {cameraError && <span className="ai-stage__camera-error">{cameraError}</span>}
      </div>

      <div className="ai-stage__phone-controls">
        <label>
          Téléphone SensaGram
          <input value={phoneHost} onChange={(event) => setPhoneHost(event.target.value)} placeholder="192.168.43.1" />
        </label>
        <div className="ai-stage__camera-buttons">
          <button
            type="button"
            onClick={() =>
              refreshPhoneStatus().catch((error) => appendRuntimeLog(`Téléphone indisponible: ${error instanceof Error ? error.message : String(error)}`))
            }
          >
            Tester
          </button>
          <button
            type="button"
            onClick={() =>
              configurePhoneSensors({
                sensors: ['android.sensor.accelerometer', 'android.sensor.gyroscope'],
                gps: true,
                micro: true,
                camera: true,
                streaming: 'start',
                cameraResolution: 'LOW',
                cameraIntervalMs: 100,
              }).catch((error) => appendRuntimeLog(`Configuration téléphone échouée: ${error instanceof Error ? error.message : String(error)}`))
            }
          >
            Activer
          </button>
          <button
            type="button"
            onClick={() => readPhoneSensors().catch((error) => appendRuntimeLog(`Lecture téléphone échouée: ${error instanceof Error ? error.message : String(error)}`))}
          >
            Lire
          </button>
          <button type="button" onClick={() => setUsePhoneCamera((enabled) => !enabled)}>
            {usePhoneCamera ? 'Caméra locale' : 'Caméra téléphone'}
          </button>
          <button type="button" onClick={() => setCameraPreviewOpen(true)}>
            Fenêtre caméra
          </button>
        </div>
        <div className="ai-stage__camera-buttons">
          <button type="button" onClick={() => startPhoneUdp().catch((error) => appendRuntimeLog(`UDP téléphone échoué: ${error instanceof Error ? error.message : String(error)}`))}>
            UDP on
          </button>
          <button type="button" onClick={() => stopPhoneUdp().catch((error) => appendRuntimeLog(`Arrêt UDP échoué: ${error instanceof Error ? error.message : String(error)}`))}>
            UDP off
          </button>
        </div>
        <span className={phoneConnected ? 'ai-stage__phone-ok' : 'ai-stage__camera-error'}>
          {phoneConnected ? `Connecté ${phoneStatus?.dashboardUrl ?? phoneHost}` : 'Téléphone non connecté'}
        </span>
        {lastPhoneSensors[0] && <span className="ai-stage__phone-reading">Dernier capteur: {lastPhoneSensors[0].type}</span>}
      </div>

      <video ref={videoRef} hidden autoPlay playsInline muted />
      <canvas ref={canvasRef} hidden />

      <div className="ai-stage__status">
        <span>Statut: {runtimeStatus}</span>
        <span>
          Résultat: {lastDetection ? `${lastDetection.label} (${Math.round(lastDetection.confidence * 100)} %)` : 'aucun'}
        </span>
      </div>

      <pre className="ai-stage__logs">{runtimeLogs.join('\n')}</pre>

      {cameraPreviewOpen && (
        <div className="ai-stage__camera-window" role="dialog" aria-modal="true" aria-label="Fenêtre caméra">
          <div className="ai-stage__camera-window-panel">
            <div className="ai-stage__camera-window-header">
              <div>
                <strong>{usePhoneCamera ? 'Caméra téléphone' : 'Caméra locale'}</strong>
                <span>{usePhoneCamera ? (phoneConnected ? phoneHost : 'Téléphone non connecté') : selectedCameraId ? 'Webcam sélectionnée' : 'Webcam par défaut'}</span>
              </div>
              <button type="button" onClick={() => setCameraPreviewOpen(false)}>
                Fermer
              </button>
            </div>
            <div className="ai-stage__camera-window-body">
              {usePhoneCamera && phoneConnected ? (
                <div className="ai-stage__camera-window-frame">
                  <img src={phoneCameraStreamUrl} alt="Images de la caméra téléphone" />
                  <div className="ai-stage__camera-window-overlay">
                    <DetectionBox result={lastDetection} />
                  </div>
                </div>
              ) : !usePhoneCamera && cameraStream ? (
                <div className="ai-stage__camera-window-frame">
                  <video ref={previewVideoRef} autoPlay playsInline muted />
                  <div className="ai-stage__camera-window-overlay">
                    <DetectionBox result={lastDetection} />
                  </div>
                </div>
              ) : (
                <div className="ai-stage__camera-window-empty">
                  <span>{usePhoneCamera ? 'Connecte d’abord SensaGram avec Tester puis Activer.' : 'Ouvre d’abord la caméra locale.'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
