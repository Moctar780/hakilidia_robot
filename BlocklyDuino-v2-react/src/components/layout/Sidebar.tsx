import { useState } from 'react';
import { Search, ChevronDown, ChevronRight, SplitSquareHorizontal, Repeat, Calculator, Type, List, Palette, Variable, FunctionSquare, Camera, Bot, Smartphone, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useResponsive } from '../../context/ResponsiveContext';
import { BLOCKS_BY_CATEGORY, blockTypeToLabel } from '../../constants/blocks';

type Category = {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  group: 'standard' | 'custom';
};

const categories: Category[] = [
  // === Blocs IA / Robot / Téléphone ===
  { id: 'ROBOT', name: 'Robot', icon: Bot, color: '#16A34A', group: 'custom' },
  { id: 'AI', name: 'IA Camera', icon: Camera, color: '#7C3AED', group: 'custom' },
  { id: 'PHONE', name: 'Capteurs téléphone', icon: Smartphone, color: '#0EA5E9', group: 'custom' },

  // === Blocs standards Blockly ===
  { id: 'LOGIC', name: 'Logique', icon: SplitSquareHorizontal, color: '#5C81A6', group: 'standard' },
  { id: 'LOOPS', name: 'Boucles', icon: Repeat, color: '#5CB65C', group: 'standard' },
  { id: 'MATH', name: 'Math', icon: Calculator, color: '#5B67A5', group: 'standard' },
  { id: 'TEXT', name: 'Texte', icon: Type, color: '#5BA58C', group: 'standard' },
  { id: 'LIST', name: 'Listes', icon: List, color: '#CC5B22', group: 'standard' },
  { id: 'COLOUR', name: 'Couleur', icon: Palette, color: '#A55B5B', group: 'standard' },
  { id: 'VARIABLES', name: 'Variables', icon: Variable, color: '#A55BA5', group: 'standard' },
  { id: 'FUNCTIONS', name: 'Fonctions', icon: FunctionSquare, color: '#A56B5B', group: 'standard' },
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
    { label: 'IA & Connectivité', key: 'custom' as const },
    { label: 'Blocs standards', key: 'standard' as const },
  ];

  return (
    <aside
      className="flex h-full w-[280px] shrink-0 flex-col border-r bg-white dark:bg-[#0F172A]"
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
      <div className="flex-1 overflow-y-auto overflow-x-visible p-2">
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
}: {
  cat: Category;
  isDisabled: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onCollapse: () => void;
}) {
  const { blockly } = useApp();
  const { closeSidebar } = useResponsive();
  const blockList = BLOCKS_BY_CATEGORY[cat.id]?.blocks ?? [];
  const hasBlocks = blockList.length > 0;

  const addBlock = (blockType: string) => {
    if (!isDisabled) {
      blockly?.addBlock(blockType, 100, 100);
      closeSidebar();
    }
  };

  return (
    <div className="mb-0.5">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onCollapse}
          className="flex cursor-pointer items-center justify-center rounded p-0.5 transition-colors hover:bg-[var(--color-surface-alt)]"
          style={{ color: 'var(--color-muted)', visibility: hasBlocks ? 'visible' : 'hidden' }}
        >
          {collapsed ? (
            <ChevronRight size={12} />
          ) : (
            <ChevronDown size={12} style={{ transition: 'transform 0.2s' }} />
          )}
        </button>
        {/* Clic sur le nom → déplier/replier les blocs */}
        <button
          type="button"
          onClick={onCollapse}
          className="flex flex-1 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm font-medium transition-all active:scale-[0.98]"
          style={{ color: 'var(--color-text)' }}
        >
          <div className="flex h-5 w-5 items-center justify-center rounded text-white" style={{ backgroundColor: cat.color }}>
            <cat.icon size={12} />
          </div>
          <span className="flex-1 text-left">{cat.name}</span>
          <span className="text-[10px]" style={{ color: 'var(--color-muted)' }}>
            {blockList.length}
          </span>
        </button>
        {/* Bouton œil → afficher/masquer dans Blockly */}
        <button
          type="button"
          onClick={onToggle}
          className="flex cursor-pointer items-center justify-center rounded p-1 transition-colors hover:bg-[var(--color-surface-alt)]"
          style={{ color: isDisabled ? 'var(--color-muted)' : cat.color }}
          title={isDisabled ? 'Afficher dans Blockly' : 'Masquer de Blockly'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isDisabled ? (
              // EyeOff
              <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>
            ) : (
              // Eye
              <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
            )}
          </svg>
        </button>
      </div>

      {/* Liste des blocs de la catégorie (visible si dépliée et non masquée) */}
      {!collapsed && !isDisabled && hasBlocks && (
        <div className="ml-4 space-y-0.5 border-l-2 pl-2 pt-0.5" style={{ borderColor: cat.color + '40' }}>
          {blockList.map((blockType) => (
            <BlockItem
              key={blockType}
              blockType={blockType}
              catColor={cat.color}
              onAdd={() => addBlock(blockType)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Aperçu visuel d'un bloc Blockly (tooltip latéral) */
function BlockPreview({ label, color }: { label: string; color: string }) {
  return (
    <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
      {/* Flèche gauche */}
      <div
        className="absolute right-full top-1/2 -mt-1 h-2 w-2 rotate-45"
        style={{ backgroundColor: color }}
      />
      {/* Corps du bloc */}
      <div
        className="flex items-center gap-2 rounded-md px-3 py-2 shadow-xl"
        style={{
          backgroundColor: color,
          borderTopLeftRadius: '4px',
          borderBottomLeftRadius: '4px',
          borderTopRightRadius: '8px',
          borderBottomRightRadius: '8px',
          minWidth: '140px',
        }}
      >
        {/* Encoche gauche (style Blockly) */}
        <div
          className="h-3 w-2 shrink-0 rounded-r-full"
          style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}
        />
        <span className="whitespace-nowrap text-xs font-semibold text-white drop-shadow-sm">
          {label}
        </span>
        {/* Pastille de connexion (style Blockly) */}
        <div
          className="ml-auto h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.35)' }}
        />
      </div>
    </div>
  );
}

function BlockItem({
  blockType,
  catColor,
  onAdd,
}: {
  blockType: string;
  catColor: string;
  onAdd: () => void;
}) {
  const label = blockTypeToLabel(blockType);

  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onAdd}
        className="flex w-full cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-all hover:bg-[var(--color-surface-alt)] active:scale-[0.97]"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        <Plus size={10} style={{ color: catColor }} />
        <span>{label}</span>
      </button>
      <BlockPreview label={label} color={catColor} />
    </div>
  );
}
