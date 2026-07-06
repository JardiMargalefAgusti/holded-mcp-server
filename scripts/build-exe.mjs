#!/usr/bin/env node
/**
 * Construye el ejecutable autónomo holded-mcp.exe.
 *
 * Pipeline:
 *   1. tsc          → compila TS a build/ (ESM)
 *   2. esbuild      → empaqueta build/main.js en un único CJS (build-exe/bundle.cjs),
 *                     inyectando la versión desde package.json
 *   3. @yao-pkg/pkg → mete Node + el bundle en dist-exe/holded-mcp.exe
 *
 * El .exe resultante es a la vez instalador, desinstalador y servidor MCP:
 *   doble clic → menú de instalación | Claude lo lanza con "serve" → servidor.
 * La API key NO se embebe: se pide durante la instalación y queda en la config de Claude.
 */
import * as esbuild from 'esbuild';
import { exec as pkgExec } from '@yao-pkg/pkg';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TARGET = 'node22-win-x64';

async function main() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
  const version = pkg.version;

  // 1. Compilar TS → build/
  console.log('[1/3] tsc -> build/ ...');
  execSync('npx tsc', { cwd: ROOT, stdio: 'inherit' });

  // 2. Bundle CJS con la versión embebida
  console.log('[2/3] esbuild -> build-exe/bundle.cjs ...');
  const bundlePath = path.join(ROOT, 'build-exe', 'bundle.cjs');
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'build', 'main.js')],
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node22',
    outfile: bundlePath,
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
    logLevel: 'warning',
  });

  // 3. Empaquetar con pkg → dist-exe/holded-mcp.exe
  console.log('[3/3] pkg -> dist-exe/holded-mcp.exe ...');
  const outExe = path.join(ROOT, 'dist-exe', 'holded-mcp.exe');
  fs.mkdirSync(path.dirname(outExe), { recursive: true });
  await pkgExec([bundlePath, '--targets', TARGET, '--output', outExe]);

  console.log(`\n[OK] Ejecutable generado: ${outExe} (v${version})`);
  console.log('     Distribuyelo: doble clic -> instala en C:\\Holded-MCP y registra en Claude.');
}

main().catch((e) => {
  console.error('Error en build:', e?.message ?? e);
  process.exit(1);
});
