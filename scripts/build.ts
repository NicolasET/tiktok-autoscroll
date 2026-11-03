// Bundles the extension into dist/ (the folder Chrome loads). Pass --watch to rebuild on change.
import { build, context, type BuildOptions, type Plugin } from 'esbuild';
import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outdir = path.join(root, 'dist');
const watch = process.argv.includes('--watch');

/** Files copied verbatim, as [source, destination inside dist/]. */
const STATIC_FILES: readonly (readonly [string, string])[] = [
  ['src/content/content.css', 'content.css'],
  ['src/popup/popup.html', 'popup/popup.html'],
  ['src/popup/popup.css', 'popup/popup.css'],
  ['icons', 'icons'],
];

async function readJson<T>(relativePath: string): Promise<T> {
  return JSON.parse(await readFile(path.join(root, relativePath), 'utf8')) as T;
}

/** package.json is the single source of truth for the extension version. */
async function writeManifest(): Promise<void> {
  const { version } = await readJson<{ version: string }>('package.json');
  const manifest = await readJson<Record<string, unknown>>('src/manifest.json');
  const ordered = {
    manifest_version: manifest.manifest_version,
    name: manifest.name,
    version,
    ...manifest,
  };
  await writeFile(path.join(outdir, 'manifest.json'), `${JSON.stringify(ordered, null, 2)}\n`);
}

async function copyStaticFiles(): Promise<void> {
  await Promise.all(
    STATIC_FILES.map(([from, to]) =>
      cp(path.join(root, from), path.join(outdir, to), { recursive: true }),
    ),
  );
  await writeManifest();
}

const staticFiles: Plugin = {
  name: 'static-files',
  setup(pluginBuild) {
    pluginBuild.onEnd(async (result) => {
      if (result.errors.length === 0) await copyStaticFiles();
    });
  },
};

const options: BuildOptions = {
  absWorkingDir: root,
  entryPoints: {
    content: 'src/content/main.ts',
    background: 'src/background/main.ts',
    'popup/popup': 'src/popup/main.ts',
  },
  outdir,
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  charset: 'utf8',
  legalComments: 'none',
  sourcemap: watch ? 'inline' : false,
  logLevel: 'info',
  plugins: [staticFiles],
};

await rm(outdir, { recursive: true, force: true });

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
