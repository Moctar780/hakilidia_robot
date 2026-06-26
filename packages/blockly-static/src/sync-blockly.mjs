import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../../..');
const legacy = path.join(root, 'BlocklyDuino-v2');
const sharedPublic = path.join(root, 'packages/blockly-static/public');
const webPublic = path.join(root, 'BlocklyDuino-v2-react/public/blockly-static');
const mobilePublic = path.join(root, 'blocklyduino-mobile/assets/blockly-web');

const copiedDirs = ['@blockly', 'generators', 'blocklyduino', 'msg', 'css', 'tools'];

async function copyDir(name, targetRoot) {
  await cp(path.join(legacy, name), path.join(targetRoot, name), {
    recursive: true,
    force: true,
    errorOnExist: false,
    filter: (src) => !src.includes(`${path.sep}ace${path.sep}`),
  });
}

async function copyStaticTarget(targetRoot) {
  await rm(targetRoot, { recursive: true, force: true });
  await mkdir(targetRoot, { recursive: true });

  for (const dir of copiedDirs) {
    await copyDir(dir, targetRoot);
  }

  await cp(path.join(legacy, 'js'), path.join(targetRoot, 'js'), {
    recursive: true,
    force: true,
    filter: (src) => !src.includes(`${path.sep}ace${path.sep}`),
  });
  await cp(path.join(sharedPublic, 'workspace.html'), path.join(targetRoot, 'workspace.html'));
  await cp(path.join(sharedPublic, 'bridge-init.js'), path.join(targetRoot, 'bridge-init.js'));
  await cp(path.join(sharedPublic, 'ai-blocks.js'), path.join(targetRoot, 'ai-blocks.js'));
}

await mkdir(sharedPublic, { recursive: true });
await copyStaticTarget(webPublic);
await copyStaticTarget(mobilePublic);

console.log(`Blockly assets synchronisés depuis ${legacy}`);
