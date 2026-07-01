import { BlocklyPanel } from './BlocklyPanel';

export function WorkspaceArea() {
  return (
    <main className="flex flex-1 overflow-hidden">
      <BlocklyPanel />
    </main>
  );
}
