import { useState } from 'react';
import { Search, ChevronDown, SplitSquareHorizontal, Repeat, Calculator, Type, List, Palette, Variable, FunctionSquare, Cpu, Waves, Thermometer, Cable, Zap, Camera, Bot, Smartphone, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';

type Category = {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  group: 'standard' | 'arduino' | 'custom';
};

const categories: Category[] = [
  // === Blocs standards Blockly ===
  { id: 'LOGIC', name: 'Logique', icon: SplitSquareHorizontal, color: '#5C81A6', group: 'standard' },
  { id: 'LOOPS', name: 'Boucles', icon: Repeat, color: '#5CB65C', group: 'standard' },
  { id: 'MATH', name: 'Math', icon: Calculator, color: '#5B67A5', group: 'standard' },
  { id: 'TEXT', name: 'Texte', icon: Type, color: '#5BA58C', group: 'standard' },
  { id: 'LISTS', name: 'Listes', icon: List, color: '#CC5B22', group: 'standard' },
  { id: 'COLOUR', name: 'Couleur', icon: Palette, color: '#A55B5B', group: 'standard' },
  { id: 'VARIABLES', name: 'Variables', icon: Variable, color: '#A55BA5', group: 'standard' },
  { id: 'FUNCTIONS', name: 'Fonctions', icon: FunctionSquare, color: '#A56B5B', group: 'standard' },

  // === Blocs Arduino ===
  { id: 'BOARD', name: 'Carte', icon: Cpu, color: '#0F766E', group: 'arduino' },
  { id: 'SEEED', name: 'Grove', icon: Waves, color: '#14B8A6', group: 'arduino' },
  { id: 'DS18B20', name: 'DS18B20', icon: Thermometer, color: '#F59E0B', group: 'arduino' },
  { id: 'RELAY', name: 'Relais', icon: Cable, color: '#F97316', group: 'arduino' },
  { id: 'SERVO', name: 'Servo', icon: Zap, color: '#EF4444', group: 'arduino' },

  // === Blocs IA / Robot / Téléphone ===
  { id: 'AI', name: 'IA Camera', icon: Camera, color: '#7C3AED', group: 'custom' },
  { id: 'ROBOT', name: 'Robot', icon: Bot, color: '#16A34A', group: 'custom' },
  { id: 'PHONE', name: 'Capteurs téléphone', icon: Smartphone, color: '#0EA5E9', group: 'custom' },
];

export function Sidebar() {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [disabled, setDisabled] = useState<Record<string, boolean>>({});
  const { blockly } = useApp();

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleCategory = (id: string) => {
    const newState = !disabled[id];
    setDisabled((prev) => ({ ...prev, [id]: newState }));
    blockly?.toggleCategory(id, !newState);
  };

  const filtered = search.trim()
    ? categories.filter((cat) => cat.name.toLowerCase().includes(search.toLowerCase()))
    : categories;

  const groups = [
    { label: 'Blocs standards', key: 'standard' as const },
    { label: 'Arduino', key: 'arduino' as const },
    { label: 'IA & Connectivité', key: 'custom' as const },
  ];

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
        {search.trim() ? (
          // Mode recherche : toutes les catégories plates
          filtered.map((cat) => (
            <CategoryItem
              key={cat.id}
              cat={cat}
              isDisabled={!!disabled[cat.id]}
              collapsed={false}
              onToggle={() => toggleCategory(cat.id)}
              onCollapse={() => {}}
              showCollapse={false}
            />
          ))
        ) : (
          // Mode normal : groupé par section
          groups.map((group) => {
            const groupCats = categories.filter((c) => c.group === group.key);
            if (groupCats.length === 0) return null;
            return (
              <div key={group.key} className="mb-2">
                <div
                  className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {group.label}
                </div>
                {groupCats.map((cat) => (
                  <CategoryItem
                    key={cat.id}
                    cat={cat}
                    isDisabled={!!disabled[cat.id]}
                    collapsed={!!collapsed[cat.id]}
                    onToggle={() => toggleCategory(cat.id)}
                    onCollapse={() => toggleCollapse(cat.id)}
                    showCollapse={true}
                  />
                ))}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

function CategoryItem({
  cat,
  isDisabled,
  collapsed,
  onToggle,
  onCollapse,
  showCollapse,
}: {
  cat: Category;
  isDisabled: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onCollapse: () => void;
  showCollapse: boolean;
}) {
  return (
    <div className="mb-0.5">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onCollapse}
          className="flex cursor-pointer items-center justify-center rounded p-0.5 transition-colors hover:bg-[var(--color-surface-alt)]"
          style={{ color: 'var(--color-muted)', visibility: showCollapse ? 'visible' : 'hidden' }}
        >
          <ChevronDown
            size={12}
            style={{
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          />
        </button>
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm font-medium transition-all active:scale-[0.98]"
          style={{
            color: isDisabled ? 'var(--color-muted)' : 'var(--color-text)',
            opacity: isDisabled ? 0.5 : 1,
          }}
        >
          <div className="flex h-5 w-5 items-center justify-center rounded text-white" style={{ backgroundColor: cat.color }}>
            <cat.icon size={12} />
          </div>
          <span className="flex-1 text-left">{cat.name}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="flex cursor-pointer items-center justify-center rounded p-0.5 transition-colors hover:bg-[var(--color-surface-alt)]"
            title={isDisabled ? 'Afficher' : 'Masquer'}
          >
            {isDisabled ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        </button>
      </div>
    </div>
  );
}
