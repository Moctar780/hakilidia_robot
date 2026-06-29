/**
 * Gestion du format de fichier .blocklyia
 * Permet d'exporter et d'importer des projets Blockly IA complets.
 */

export type BlocklyProjectFile = {
  /** Version du format (pour compatibilité ascendante) */
  formatVersion: 1;
  /** Nom du projet */
  name: string;
  /** XML du workspace Blockly (tous les blocs) */
  workspaceXml: string;
  /** Code Arduino/runtime généré */
  runtimeCode: string;
  /** Date de création ISO */
  createdAt: string;
  /** Date de modification ISO */
  updatedAt: string;
  /** Métadonnées */
  meta: {
    app: 'BlocklyDuino IA';
    blocksCount: number;
  };
};

const FORMAT_EXTENSION = '.blocklyia';
const MIME_TYPE = 'application/json';

/**
 * Compte le nombre de blocs dans un XML Blockly.
 */
function countBlocks(xml: string): number {
  return (xml.match(/<block\b/g) || []).length;
}

/**
 * Crée un objet fichier projet à partir des données actuelles.
 */
export function createProjectFile(
  name: string,
  workspaceXml: string,
  runtimeCode: string,
  createdAt: string,
): BlocklyProjectFile {
  return {
    formatVersion: 1,
    name,
    workspaceXml,
    runtimeCode,
    createdAt,
    updatedAt: new Date().toISOString(),
    meta: {
      app: 'BlocklyDuino IA',
      blocksCount: countBlocks(workspaceXml),
    },
  };
}

/**
 * Valide qu'un objet est un fichier projet Blockly IA valide.
 */
export function validateProjectFile(data: unknown): data is BlocklyProjectFile {
  if (!data || typeof data !== 'object') return false;
  const file = data as Record<string, unknown>;
  return (
    file.formatVersion === 1 &&
    typeof file.name === 'string' &&
    typeof file.workspaceXml === 'string' &&
    typeof file.runtimeCode === 'string'
  );
}

/**
 * Exporte un projet en déclenchant le téléchargement du fichier .blocklyia.
 */
export function downloadProjectFile(file: BlocklyProjectFile): void {
  const safeName = file.name.replace(/[^a-zA-Z0-9À-ÿ\s_-]/g, '').trim() || 'projet';
  const filename = `${safeName}${FORMAT_EXTENSION}`;
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Ouvre un sélecteur de fichier pour importer un projet .blocklyia.
 * @returns Le fichier projet parsé, ou null si l'utilisateur annule.
 */
export function importProjectFile(): Promise<BlocklyProjectFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = `.blocklyia,${MIME_TYPE}`;
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        const text = await file.text();
        const data = JSON.parse(text) as unknown;
        if (validateProjectFile(data)) {
          resolve(data);
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}
