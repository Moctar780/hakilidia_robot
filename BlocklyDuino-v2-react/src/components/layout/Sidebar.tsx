import { useState } from 'react';
import { Search, ChevronDown, Camera, Cpu, Repeat, Calculator, Type, Variable, Zap, Radio, Video, Brain, CableCar, MapPin, Smartphone, Database } from 'lucide-react';

type Category = {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
};

const categories: Category[] = [
  { id: 'ai-camera', name: 'IA Camera', icon: Camera, color: '#7C3AED' },
  { id: 'arduino', name: 'Arduino', icon: Cpu, color: '#0F766E' },
  { id: 'loops', name: 'Boucles', icon: Repeat, color: '#F59E0B' },
  { id: 'math', name: 'Math', icon: Calculator, color: '#3B82F6' },
  { id: 'text', name: 'Texte', icon: Type, color: '#8B5CF6' },
  { id: 'variables', name: 'Variables', icon: Variable, color: '#EC4899' },
  { id: 'robot', name: 'Robot', icon: Zap, color: '#EF4444' },
  { id: 'communication', name: 'Communication', icon: Radio, color: '#14B8A6' },
  { id: 'camera', name: 'Caméra', icon: Video, color: '#06B6D4' },
  { id: 'ai', name: 'IA', icon: Brain, color: '#A855F7' },
  { id: 'relay', name: 'Relais', icon: CableCar, color: '#F97316' },
  { id: 'gps', name: 'GPS', icon: MapPin, color: '#22C55E' },
  { id: 'phone', name: 'Téléphone', icon: Smartphone, color: '#6366F1' },
  { id: 'storage', name: 'Stockage', icon: Database, color: '#78716C' },
];

export function Sidebar() {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filtered = search.trim()
    ? categories.filter((cat) => cat.name.toLowerCase().includes(search.toLowerCase()))
    : categories;

  return (
    <aside
      className="flex w-[280px] shrink-0 flex-col border-r bg-white dark:bg-[#0F172A]"
      style={{ borderColor: 'var(--color-border)' }}
    >
      {/* Recherche */}
      <div className="border-b p-3" style={{ borderColor: 'var(--color-border)' }}>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-muted)' }} />
          <input
            type="text"
            placeholder="Rechercher un bloc..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border bg-[var(--color-surface-alt)] py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:ring-2"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
              '--tw-ring-color': 'var(--color-primary)',
            } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Liste des catégories */}
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.map((cat) => (
          <div key={cat.id} className="mb-0.5">
            <button
              type="button"
              onClick={() => toggleCollapse(cat.id)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-[var(--color-surface-alt)]"
              style={{ color: 'var(--color-text)' }}
            >
              <div className="flex h-5 w-5 items-center justify-center rounded text-white" style={{ backgroundColor: cat.color }}>
                <cat.icon size={12} />
              </div>
              <span className="flex-1 text-left">{cat.name}</span>
              <ChevronDown
                size={14}
                style={{
                  transform: collapsed[cat.id] ? 'rotate(-90deg)' : 'rotate(0deg)',
                  color: 'var(--color-muted)',
                  transition: 'transform 0.2s',
                }}
              />
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
