import { useState } from 'react';
import { Code2, Camera, Smartphone, Brain, Copy, Download, Maximize2, Play, Square, Save, RefreshCw } from 'lucide-react';
import { CodeEditor } from '../workspace/CodeEditor';
import { AiStage } from '../ai/AiStage';
import { useApp } from '../../context/AppContext';

type Tab = 'code' | 'ai' | 'camera' | 'phone';

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'ai', label: 'IA', icon: Brain },
  { id: 'camera', label: 'Caméra', icon: Camera },
  { id: 'phone', label: 'Téléphone', icon: Smartphone },
];

export function RightPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('code');

  return (
    <aside
      className="flex w-[360px] shrink-0 flex-col border-l bg-white dark:bg-[#0F172A]"
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
        {activeTab === 'ai' && <AiCard />}
        {activeTab === 'camera' && <CameraCard />}
        {activeTab === 'phone' && <PhoneCard />}
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
          Stop
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
