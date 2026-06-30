import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Camera, StopCircle, RefreshCw, Monitor, Hand, HelpCircle, Play } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/** État du service de contrôle caméra */
type CameraStatus = {
  camera: boolean;
  running?: boolean;
  streaming?: boolean;
  fps?: number;
  resolution?: { width: number; height: number };
  pid?: number;
  startedAt?: string;
};

/* ===== Aide-mémoire des commandes gestuelles ===== */
const COMMAND_HELP = [
  { gesture: 'AVANCE', button: 'Bouton "AVANCE"', action: 'Avance en continu', cmd: 'w' },
  { gesture: 'RECULE', button: 'Bouton "RECULE"', action: 'Recule en continu', cmd: 'x' },
  { gesture: 'GAUCHE', button: 'Bouton "GAUCHE"', action: 'Pivot gauche continu', cmd: 'a' },
  { gesture: 'DROITE', button: 'Bouton "DROITE"', action: 'Pivot droit continu', cmd: 'd' },
  { gesture: 'STOP', button: 'Hors bouton / main absente', action: 'Arrêt immédiat', cmd: 's' },
  { gesture: 'OUVRIR PINCE', button: 'Bouton "OUVRIR"', action: 'Ouvre la pince (pas à pas)', cmd: 'GO 1' },
  { gesture: 'FERMER PINCE', button: 'Bouton "FERMER"', action: 'Ferme la pince (pas à pas)', cmd: 'GC 1' },
  { gesture: 'STOP PINCE', button: 'Bouton "STOP PINCE"', action: 'Arrête la pince', cmd: 'GS' },
];

const GESTURE_LABELS: Record<string, string> = {
  forward: '✅ AVANCE',
  backward: '⬇ RECULE',
  left: '⬅ GAUCHE',
  right: '➡ DROITE',
  stop: '⏹ STOP',
  gripper_open: '✊ OUVRIR PINCE',
  gripper_close: '🤏 FERMER PINCE',
  gripper_stop: '⏸ STOP PINCE',
};

export function CameraControlOverlay({ onClose }: { onClose: () => void }) {
  const { serviceUrl, appendRuntimeLog, cameraGestureActive, cameraGestureDirection } = useApp();
  const [status, setStatus] = useState<CameraStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [controlMode, setControlMode] = useState<'buttons' | 'pointing'>('buttons');
  const [mirror, setMirror] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cameraBaseUrl = serviceUrl;

  /** Appelle l'API du service arduino pour le statut caméra */
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${cameraBaseUrl}/camera/status`);
      if (!res.ok) return;
      const data = await res.json() as { ok: boolean; status: CameraStatus };
      if (data.ok) setStatus(data.status);
    } catch {
      // Le service peut être momentanément indisponible
    }
  }, [cameraBaseUrl]);

  /** Démarrer le processus caméra — contrôle le robot simulé */
  const startCamera = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${cameraBaseUrl}/camera/start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mirror, controlMode, simulate: true }),
      });
      const data = await res.json() as { ok: boolean; status: CameraStatus; error?: string };
      if (data.ok) {
        setStatus(data.status);
        appendRuntimeLog('Caméra Sparki démarrée — le robot simulé réagit aux gestes.');
        // Démarrer le polling pour suivre l'état
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(fetchStatus, 2000);
      } else {
        setError(data.error ?? 'Échec du démarrage caméra');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [cameraBaseUrl, mirror, controlMode, appendRuntimeLog, fetchStatus]);

  /** Arrêter le processus caméra */
  const stopCamera = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${cameraBaseUrl}/camera/stop`, { method: 'POST' });
      const data = await res.json() as { ok: boolean; status: CameraStatus };
      if (data.ok) {
        setStatus(data.status);
        appendRuntimeLog('Caméra Sparki arrêtée.');
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }, [cameraBaseUrl, appendRuntimeLog]);

  // Nettoyage
  useEffect(() => {
    fetchStatus();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStatus]);

  // Touche Échap pour fermer
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const isRunning = status?.running ?? false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={overlayRef}
        className="relative flex max-h-[90vh] max-w-[95vw] flex-col gap-4 rounded-2xl border bg-white p-5 shadow-2xl dark:bg-[#0F172A]"
        style={{ borderColor: 'var(--color-border)', width: 700, maxHeight: '90vh' }}
      >
        {/* Barre de titre */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
              Contrôle par caméra
            </h3>
            {isRunning && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-600" />
                Actif
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex cursor-pointer items-center justify-center rounded-lg border bg-white p-1.5 transition-all hover:bg-[var(--color-surface-alt)] active:scale-95 dark:bg-[#1E293B]"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
            title="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Zone de contenu scrollable */}
        <div className="flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 130px)' }}>
          {/* Cartes d'information */}
          <div className="grid grid-cols-3 gap-3">
            {/* Statut processus */}
            <div
              className="rounded-lg border p-3"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-alt)' }}
            >
              <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                <Monitor size={14} />
                Caméra
              </div>
              <div className="mt-1 text-sm font-semibold" style={{ color: isRunning ? 'var(--color-success)' : 'var(--color-muted)' }}>
                {isRunning ? 'Active' : 'Arrêtée'}
              </div>
              {status?.startedAt && (
                <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  {new Date(status.startedAt).toLocaleTimeString()}
                </div>
              )}
            </div>

            {/* Geste détecté en direct */}
            <div
              className="rounded-lg border p-3"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: cameraGestureActive ? 'rgba(34,197,94,0.08)' : 'var(--color-surface-alt)',
              }}
            >
              <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                <Hand size={14} />
                Geste détecté
              </div>
              <div className="mt-1 text-sm font-semibold" style={{
                color: cameraGestureActive ? 'var(--color-success)' : 'var(--color-muted)',
              }}>
                {cameraGestureActive
                  ? (GESTURE_LABELS[cameraGestureDirection] ?? cameraGestureDirection)
                  : 'Aucun geste'
                }
              </div>
              {cameraGestureActive && (
                <div className="mt-0.5 text-xs" style={{ color: 'var(--color-success)' }}>
                  Robot simulé en mouvement
                </div>
              )}
            </div>

            {/* Mode de contrôle */}
            <div
              className="rounded-lg border p-3"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-alt)' }}
            >
              <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                <Monitor size={14} />
                Mode
              </div>
              <div className="mt-1 flex gap-1">
                <button
                  type="button"
                  onClick={() => setControlMode('buttons')}
                  disabled={isRunning}
                  className={`flex-1 cursor-pointer rounded px-1.5 py-0.5 text-xs font-medium transition-all ${
                    controlMode === 'buttons'
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'border bg-white dark:bg-[#1E293B]'
                  } ${isRunning ? 'cursor-not-allowed opacity-50' : ''}`}
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  Boutons
                </button>
                <button
                  type="button"
                  onClick={() => setControlMode('pointing')}
                  disabled={isRunning}
                  className={`flex-1 cursor-pointer rounded px-1.5 py-0.5 text-xs font-medium transition-all ${
                    controlMode === 'pointing'
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'border bg-white dark:bg-[#1E293B]'
                  } ${isRunning ? 'cursor-not-allowed opacity-50' : ''}`}
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  Pointage
                </button>
              </div>
              <label className="mt-1.5 flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={mirror}
                  onChange={(e) => setMirror(e.target.checked)}
                  disabled={isRunning}
                  className="h-3 w-3 rounded border-gray-300"
                />
                <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  Miroir
                </span>
              </label>
            </div>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Boutons d'action */}
          <div className="flex gap-3">
            {isRunning ? (
              <button
                type="button"
                onClick={stopCamera}
                disabled={loading}
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-error)' }}
              >
                <StopCircle size={16} />
                {loading ? 'Arrêt...' : 'Arrêter la caméra'}
              </button>
            ) : (
              <button
                type="button"
                onClick={startCamera}
                disabled={loading}
                className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Play size={16} />
                {loading ? 'Démarrage...' : 'Lancer la caméra'}
              </button>
            )}
            <button
              type="button"
              onClick={fetchStatus}
              disabled={loading}
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border bg-white p-2.5 transition-all hover:bg-[var(--color-surface-alt)] active:scale-95 disabled:opacity-50 dark:bg-[#1E293B]"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              title="Actualiser"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Aide-mémoire des commandes */}
          <div
            className="rounded-lg border"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
              <HelpCircle size={14} style={{ color: 'var(--color-primary)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--color-text)' }}>
                Commandes gestuelles
              </span>
              <span className="ml-auto text-xs" style={{ color: 'var(--color-muted)' }}>
                Mode: {controlMode === 'buttons' ? 'Boutons virtuels' : 'Pointage directionnel'}
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {COMMAND_HELP.map((item) => (
                <div key={item.gesture} className="flex items-center px-3 py-1.5 text-xs">
                  <span className="w-28 font-medium" style={{ color: 'var(--color-text)' }}>
                    {item.gesture}
                  </span>
                  <span className="flex-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {item.button}
                  </span>
                  <span className="w-24 text-right font-mono" style={{ color: 'var(--color-muted)' }}>
                    {item.cmd}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t px-3 py-2 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}>
              <span className="font-medium">Raccourci :</span> Touche <kbd className="rounded border bg-[var(--color-surface-alt)] px-1 font-mono text-xs" style={{ borderColor: 'var(--color-border)' }}>q</kbd> ou <kbd className="rounded border bg-[var(--color-surface-alt)] px-1 font-mono text-xs" style={{ borderColor: 'var(--color-border)' }}>Esc</kbd> dans la fenêtre OpenCV pour arrêter
            </div>
          </div>

          {/* Note importante */}
          <div
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-300"
          >
            <strong>Mode simulation :</strong> Le robot simulé dans le panneau Simulateur réagit en temps réel à vos gestes.
            Placez votre main devant la webcam et utilisez votre index pour piloter le Sparki virtuel.
            Les gestes sont transmis via WebSocket — regardez le sprite bouger dans le simulateur !
          </div>
        </div>
      </div>
    </div>
  );
}
