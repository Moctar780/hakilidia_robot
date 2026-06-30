import { useState, useEffect, useRef, useCallback } from 'react';
import { Code2, Camera, Smartphone, Brain, Cpu, Copy, Download, Maximize2, Minimize2, Play, Square, Save, RefreshCw, Cuboid as Cube3D } from 'lucide-react';
import { CodeEditor } from '../workspace/CodeEditor';
import { AiStage } from '../ai/AiStage';
import { RobotSimulator } from '../simulator/RobotSimulator';
import { Rover3DCanvas } from '../simulator/Rover3DCanvas';
import { Rover3DOverlay } from '../simulator/Rover3DOverlay';
import { useApp } from '../../context/AppContext';

type Tab = 'code' | 'ai' | 'camera' | 'simulator' | 'phone';

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'ai', label: 'IA', icon: Brain },
  { id: 'camera', label: 'Caméra', icon: Camera },
  { id: 'simulator', label: 'Simulateur', icon: Cpu },
  { id: 'phone', label: 'Téléphone', icon: Smartphone },
];

export function RightPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('code');

  return (
    <aside
      className="flex h-full w-[360px] shrink-0 flex-col border-l bg-white dark:bg-[#0F172A]"
      style={{ borderColor: 'var(--color-border)' }}
    >
      {/* Onglets */}
      <div className="flex border-b" style={{ borderColor: 'var(--color-border)' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-xs font-medium transition-all"
              style={{
                borderBottomColor: isActive ? 'var(--color-primary)' : 'transparent',
                color: isActive ? 'var(--color-primary)' : 'var(--color-muted)',
              }}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contenu des onglets */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'code' && <CodeCard />}
        {activeTab === 'camera' && <CameraCard />}
        {activeTab === 'simulator' && <SimulatorCard />}
        {activeTab === 'phone' && <PhoneCard />}
        {/* AiCard toujours monté pour que l'écouteur global blocklyduino:run-ai-program reste actif */}
        <div style={{ display: activeTab === 'ai' ? 'contents' : 'none' }}>
          <AiCard />
        </div>
      </div>
    </aside>
  );
}

/* ===== Carte Code ===== */
function CodeCard() {
  return (
    <div className="flex h-full flex-col p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Code Arduino</h3>
        <div className="flex gap-1">
          <IconBtn icon={Copy} label="Copier" />
          <IconBtn icon={Download} label="Télécharger" />
          <IconBtn icon={Maximize2} label="Plein écran" />
        </div>
      </div>
      <div className="flex-1 overflow-hidden rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
        <CodeEditor width={340} />
      </div>
    </div>
  );
}

/* ===== Carte IA ===== */
function AiCard() {
  const { runtimeStatus, stopAiProgram } = useApp();
  const isRunning = runtimeStatus === 'running';

  return (
    <div className="flex h-full flex-col gap-3 p-3">
      {/* Status */}
      <div className="flex items-center gap-2 rounded-lg border bg-[var(--color-surface-alt)] px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: 'var(--color-success)' }} />
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} />
        </span>
        <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>Service connecté</span>
      </div>

      {/* Scene IA */}
      <div className="flex-1 overflow-hidden rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
        <AiStage />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('blocklyduino:run-ai-program'))}
          disabled={isRunning}
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <Play size={14} />
          Exécuter
        </button>
        <button
          type="button"
          onClick={stopAiProgram}
          disabled={!isRunning}
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
          style={{ backgroundColor: isRunning ? 'var(--color-error)' : 'var(--color-muted)' }}
        >
          <Square size={14} />
          Arrêter
        </button>
        <IconBtn icon={Save} label="Sauvegarder" />
      </div>
    </div>
  );
}

/* ===== Carte Caméra ===== */
function CameraCard() {
  return (
    <div className="flex flex-col gap-3 p-3">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Caméra</h3>

      <div className="space-y-2">
        <label className="block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Source</label>
        <select
          className="w-full rounded-lg border bg-[var(--color-surface-alt)] px-2.5 py-1.5 text-sm outline-none"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        >
          <option>Webcam par défaut</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Résolution</label>
          <select className="w-full rounded-lg border bg-[var(--color-surface-alt)] px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
            <option>640×480</option>
            <option>1280×720</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>FPS</label>
          <select className="w-full rounded-lg border bg-[var(--color-surface-alt)] px-2 py-1 text-xs outline-none" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}>
            <option>15</option>
            <option>30</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-sm font-medium transition-all hover:bg-[var(--color-surface-alt)] active:scale-95 dark:bg-[#1E293B]"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
        >
          <Camera size={14} />
          Ouvrir
        </button>
        <IconBtn icon={RefreshCw} label="Actualiser" />
      </div>
    </div>
  );
}

/* ===== Carte Simulateur ===== */
function SimulatorCard() {
  const { sprites, rovers, simulatorMode, setSimulatorMode, runtimeStatus, use3D, setUse3D } = useApp();
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const [roverTrail, setRoverTrail] = useState<{ x: number; z: number }[]>([]);
  const [expanded, setExpanded] = useState(false);
  const sprite = sprites[0];
  const rover = rovers[0];

  // Met à jour le trail 2D
  useEffect(() => {
    if (sprite && runtimeStatus === 'running') {
      setTrail((t) => [...t.slice(-199), { x: sprite.x, y: sprite.y }]);
    }
  }, [sprite?.x, sprite?.y, runtimeStatus]);

  // Met à jour le trail 3D
  useEffect(() => {
    if (rover && runtimeStatus === 'running') {
      setRoverTrail((t) => [...t.slice(-199), { x: rover.position.x, z: rover.position.z }]);
    }
  }, [rover?.position.x, rover?.position.z, runtimeStatus]);

  useEffect(() => {
    if (runtimeStatus !== 'running') {
      setTrail([]);
      setRoverTrail([]);
    }
  }, [runtimeStatus]);

  return (
    <>
      <div className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {use3D ? 'Rover 3D' : 'Simulateur robot'}
          </h3>
          <div className="flex items-center gap-1">
            {/* Toggle 2D/3D */}
            <button
              type="button"
              onClick={() => setUse3D(!use3D)}
              className={`inline-flex cursor-pointer items-center justify-center rounded-lg border p-1.5 transition-all active:scale-95 ${
                use3D ? 'bg-[var(--color-primary)] text-white' : 'bg-white dark:bg-[#1E293B]'
              }`}
              style={{ borderColor: 'var(--color-border)', color: use3D ? 'white' : 'var(--color-text-secondary)' }}
              title={use3D ? 'Passer en 2D' : 'Passer en 3D'}
            >
              <Cube3D size={14} />
            </button>
            {/* Agrandir */}
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border bg-white p-1.5 transition-all hover:bg-[var(--color-surface-alt)] active:scale-95 dark:bg-[#1E293B]"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              title="Agrandir le simulateur"
            >
              <Maximize2 size={14} />
            </button>
            {/* Toggle simulation/physique */}
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={simulatorMode}
                onChange={(e) => setSimulatorMode(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-5 w-9 rounded-full bg-[var(--color-border)] after:absolute after:start-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[var(--color-primary)] peer-checked:after:translate-x-full" />
              <span className="ml-2 text-xs font-medium" style={{
                color: simulatorMode ? 'var(--color-primary)' : 'var(--color-muted)',
              }}>
                {simulatorMode ? 'ACTIF' : 'OFF'}
              </span>
            </label>
          </div>
        </div>

        {/* Simulateur 3D ou 2D */}
        {use3D ? (
          rover ? (
            <div className="w-full" style={{ height: 320 }}>
              <Rover3DCanvas rover={rover} trail={roverTrail} />
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border py-8" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Aucun rover</span>
            </div>
          )
        ) : sprite ? (
          <div className="flex justify-center">
            <RobotSimulator sprite={sprite} trail={trail} />
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border py-8" style={{ borderColor: 'var(--color-border)' }}>
            <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Aucun sprite</span>
          </div>
        )}

        {/* Infos */}
        <div className="rounded-lg border p-2 text-xs" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-alt)' }}>
          {use3D && rover ? (
            <>
              <div className="flex justify-between" style={{ color: 'var(--color-text-secondary)' }}>
                <span>Position</span>
                <span style={{ color: 'var(--color-text)' }}>x: {rover.position.x.toFixed(1)}  z: {rover.position.z.toFixed(1)}</span>
              </div>
              <div className="flex justify-between mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                <span>Direction</span>
                <span style={{ color: 'var(--color-text)' }}>{rover.rotation.y.toFixed(0)}°</span>
              </div>
              <div className="flex justify-between mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                <span>Batterie</span>
                <span style={{ color: rover.sensors.battery > 20 ? 'var(--color-success)' : 'var(--color-error)' }}>
                  {rover.sensors.battery.toFixed(0)}%
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between" style={{ color: 'var(--color-text-secondary)' }}>
                <span>Position</span>
                <span style={{ color: 'var(--color-text)' }}>x: {sprite?.x ?? 0}  y: {sprite?.y ?? 0}</span>
              </div>
              <div className="flex justify-between mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                <span>Direction</span>
                <span style={{ color: 'var(--color-text)' }}>{sprite?.direction ?? 90}°</span>
              </div>
            </>
          )}
          <div className="flex justify-between mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            <span>Mode</span>
            <span style={{
              color: simulatorMode ? 'var(--color-success)' : 'var(--color-error)',
              fontWeight: 500,
            }}>
              {simulatorMode ? 'Simulation' : 'Robot physique'}
            </span>
          </div>
        </div>
      </div>

      {/* Overlay plein écran */}
      {expanded && use3D && rover ? (
        <Rover3DOverlay rover={rover} trail={roverTrail} onClose={() => setExpanded(false)} />
      ) : expanded && !use3D && sprite ? (
        <SimulatorOverlay
          sprite={sprite}
          trail={trail}
          simulatorMode={simulatorMode}
          onClose={() => setExpanded(false)}
        />
      ) : null}
    </>
  );
}

/* ===== Overlay plein écran du simulateur 2D ===== */
function SimulatorOverlay({
  sprite,
  trail,
  simulatorMode,
  onClose,
}: {
  sprite: { x: number; y: number; direction: number } | undefined;
  trail: { x: number; y: number }[];
  simulatorMode: boolean;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [overlaySize, setOverlaySize] = useState(600);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;
    const measure = () => {
      const size = Math.min(el.clientWidth, el.clientHeight) - 48;
      setOverlaySize(Math.max(300, size));
    };
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={overlayRef}
        className="relative flex max-h-[95vh] max-w-[95vw] flex-col items-center gap-4 rounded-2xl border bg-white p-6 shadow-2xl dark:bg-[#0F172A]"
        style={{ borderColor: 'var(--color-border)', width: '90vmin', height: '90vmin' }}
      >
        <div className="flex w-full items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
            Simulateur robot
            {simulatorMode && (
              <span className="ml-2 text-xs font-medium" style={{ color: 'var(--color-success)' }}>
                ● Simulation
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              x: {sprite?.x ?? 0}  y: {sprite?.y ?? 0}  dir: {sprite?.direction ?? 90}°
            </span>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex cursor-pointer items-center justify-center rounded-lg border bg-white p-2 transition-all hover:bg-[var(--color-surface-alt)] active:scale-95 dark:bg-[#1E293B]"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              title="Réduire"
            >
              <Minimize2 size={16} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center w-full overflow-hidden">
          {sprite ? (
            <div className="w-full h-full flex items-center justify-center">
              <div style={{ width: overlaySize, height: overlaySize }}>
                <RobotSimulator sprite={sprite} trail={trail} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border py-16 px-8" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-sm" style={{ color: 'var(--color-muted)' }}>Aucun sprite</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== Carte Téléphone ===== */
function PhoneCard() {
  return (
    <div className="flex flex-col gap-3 p-3">
      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Téléphone</h3>

      <div className="space-y-2">
        <label className="block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Adresse IP</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="192.168.43.1"
            className="flex-1 rounded-lg border bg-[var(--color-surface-alt)] px-2.5 py-1.5 text-sm outline-none"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)' }}
          />
          <button
            type="button"
            className="inline-flex cursor-pointer items-center rounded-lg px-3 py-1.5 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Connecter
          </button>
        </div>
      </div>
    </div>
  );
}

/* ===== Bouton icône ===== */
function IconBtn({ icon: Icon, label }: { icon: React.ComponentType<{ size?: number }>; label: string }) {
  return (
    <button
      type="button"
      className="inline-flex cursor-pointer items-center justify-center rounded-lg border bg-white p-1.5 transition-all hover:bg-[var(--color-surface-alt)] active:scale-95 dark:bg-[#1E293B]"
      style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
      title={label}
    >
      <Icon size={14} />
    </button>
  );
}
