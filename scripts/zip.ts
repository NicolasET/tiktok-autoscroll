// Packs dist/ into tiktok-autoscroll-<version>.zip for the Chrome Web Store.
import { zipSync, type Zippable } from 'fflate';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

async function collectFiles(dir: string): Promise<Zippable> {
  const files: Zippable = {};
  for (const entry of await readdir(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const absolute = path.join(entry.parentPath, entry.name);
    const archivePath = path.relative(dir, absolute).split(path.sep).join('/');
    files[archivePath] = await readFile(absolute);
  }
  return files;
}

const manifest = JSON.parse(await readFile(path.join(dist, 'manifest.json'), 'utf8')) as {
  version: string;
};
const target = path.join(root, `tiktok-autoscroll-${manifest.version}.zip`);
await writeFile(target, zipSync(await collectFiles(dist), { level: 9 }));
process.stdout.write(`Wrote ${path.relative(root, target)}\n`);
