import { useEffect, useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { runAiProgram } from '../../runtime/aiRuntime';
import type { AiDetectionKind, AiDetectionResult } from '../../constants';
import './AiStage.css';

function fallbackDetection(kind: AiDetectionKind): AiDetectionResult {
  return {
    kind,
    label: kind === 'face' ? 'visage detecte' : kind === 'gender' ? 'personne' : 'robot',
    confidence: 0.76,
    at: new Date().toISOString(),
  };
}

export function AiStage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stopRequested = useRef(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [speech, setSpeech] = useState('Prêt à exécuter les blocs IA.');
  const {
    generatedCode,
    sprites,
    setSprites,
    lastDetection,
    setLastDetection,
    runtimeStatus,
    setRuntimeStatus,
    runtimeLogs,
    appendRuntimeLog,
    clearRuntimeLogs,
    inferWithAi,
    aiServiceConnected,
    saveAiProject,
    sendSparkiCommand,
  } = useApp();

  const sprite = sprites[0];

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
    refreshCameraDevices().catch((error) => {
      setCameraError(error instanceof Error ? error.message : String(error));
    });
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshCameraDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', refreshCameraDevices);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

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

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) {
      return undefined;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.78);
  };

  const detect = async (kind: AiDetectionKind) => {
    const imageDataUrl = captureFrame();
    try {
      const result = await inferWithAi({ kind, imageDataUrl });
      setLastDetection(result);
      appendRuntimeLog(`Détection ${kind}: ${result.label}`);
      return result;
    } catch {
      const result = fallbackDetection(kind);
      setLastDetection(result);
      appendRuntimeLog(`Détection locale simulée: ${result.label}`);
      return result;
    }
  };

  const runProgram = async () => {
    stopRequested.current = false;
    setRuntimeStatus('running');
    clearRuntimeLogs();
    appendRuntimeLog('Démarrage du programme IA.');
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
        sendRobotCommand: sendSparkiCommand,
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
    setRuntimeStatus('stopped');
    appendRuntimeLog('Arrêt demandé.');
  };

  return (
    <aside className="ai-stage">
      <div className="ai-stage__header">
        <div>
          <strong>Scène IA</strong>
          <span>{aiServiceConnected ? 'Service IA connecté' : 'Mode local/simulé'}</span>
        </div>
        <div className="ai-stage__actions">
          <button type="button" onClick={runProgram} disabled={runtimeStatus === 'running'}>
            Exécuter
          </button>
          <button type="button" onClick={stopProgram}>
            Arrêter
          </button>
          <button type="button" onClick={saveAiProject}>
            Sauvegarder
          </button>
        </div>
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
        </div>
        {cameraError && <span className="ai-stage__camera-error">{cameraError}</span>}
      </div>

      <div className="ai-stage__scene">
        <video ref={videoRef} className="ai-stage__camera" autoPlay playsInline muted />
        {!cameraStream && (
          <div className="ai-stage__camera-placeholder">
            <span>Caméra fermée</span>
            <small>Choisis une source puis clique sur “Ouvrir caméra”.</small>
          </div>
        )}
        {sprite && (
          <div
            className="ai-stage__sprite"
            style={{
              transform: `translate(${sprite.x}px, ${sprite.y}px) rotate(${sprite.direction - 90}deg) scale(${sprite.size / 100})`,
            }}
            aria-label={sprite.name}
          >
            <span>AI</span>
          </div>
        )}
        <div className="ai-stage__bubble">{speech}</div>
      </div>

      <canvas ref={canvasRef} hidden />

      <div className="ai-stage__status">
        <span>Statut: {runtimeStatus}</span>
        <span>
          Résultat: {lastDetection ? `${lastDetection.label} (${Math.round(lastDetection.confidence * 100)} %)` : 'aucun'}
        </span>
      </div>

      <pre className="ai-stage__logs">{runtimeLogs.join('\n')}</pre>
    </aside>
  );
}
