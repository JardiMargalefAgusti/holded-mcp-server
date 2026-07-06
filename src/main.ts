/**
 * Holded MCP — Entrada única del ejecutable (.exe)
 *
 * Según el subcomando hace una cosa u otra:
 *   (sin args, doble clic)  → menú interactivo (instalar / estado / desinstalar)
 *   serve                   → arranca el servidor MCP (lo que lanza Claude)
 *   install                 → asistente de instalación
 *   uninstall               → desinstalador
 *   register                → reescribe las configs de Claude apuntando a este .exe
 *   status                  → muestra dónde está instalado y registrado
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { spawn, spawnSync } from 'node:child_process';
import {
  MCP_KEY,
  type McpServerEntry,
  resolveDesktopConfigPaths,
  getClaudeCodeConfigPath,
  registerServer,
  removeServer,
  getServerEntry,
  findExistingApiKey,
} from './claude-config.js';

// Inyectada por esbuild en tiempo de build (scripts/build-exe.mjs) desde package.json.
declare const __APP_VERSION__: string | undefined;
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

const APP_NAME = 'Holded MCP';
const INSTALL_DIR = 'C:\\Holded-MCP';
const EXE_BASENAME = 'holded-mcp';
const UNINSTALL_REG_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Holded-MCP';
const REPO_URL = 'https://github.com/JardiMargalefAgusti/holded-mcp-server';

// ---------- utilidades de consola ----------
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};
const log = (msg = '') => console.log(msg);
const ok = (msg: string) => console.log(`${c.green}[OK]${c.reset} ${msg}`);
const warn = (msg: string) => console.log(`${c.yellow}[!]${c.reset} ${msg}`);
const err = (msg: string) => console.log(`${c.red}[X]${c.reset} ${msg}`);
const step = (n: number, total: number, msg: string) =>
  console.log(`\n${c.cyan}[${n}/${total}]${c.reset} ${c.bold}${msg}${c.reset}`);

function banner(subtitle: string): void {
  log(`${c.bold}${c.cyan}`);
  log('  ================================================');
  log(`   ${APP_NAME} — ${subtitle}`);
  log('  ================================================');
  log(c.reset);
}

// Entrada de consola robusta: una ÚNICA interfaz readline para todo el
// programa, con cola de líneas. Así funciona igual en interactivo y con la
// entrada por tubería (las líneas que llegan entre pregunta y pregunta se
// encolan en vez de perderse) y un stdin cerrado (EOF) responde '' — es
// decir, la opción por defecto — en vez de dejar el instalador colgado.
let stdinEnded = false;
let inputStarted = false;
const pendingLines: string[] = [];
let waiter: ((line: string) => void) | null = null;

function startInput(): void {
  if (inputStarted) return;
  inputStarted = true;
  const iface = readline.createInterface({ input: process.stdin, output: process.stdout });
  iface.on('line', (line) => {
    if (waiter) {
      const w = waiter;
      waiter = null;
      w(line);
    } else {
      pendingLines.push(line);
    }
  });
  iface.on('close', () => {
    stdinEnded = true;
    if (waiter) {
      const w = waiter;
      waiter = null;
      w('');
    }
  });
}

function question(prompt: string): Promise<string> {
  startInput();
  process.stdout.write(prompt);
  if (pendingLines.length > 0) {
    const line = pendingLines.shift() as string;
    process.stdout.write(`${line}\n`);
    return Promise.resolve(line);
  }
  if (stdinEnded) {
    process.stdout.write('\n');
    return Promise.resolve('');
  }
  return new Promise((resolve) => { waiter = resolve; });
}

async function pause(message = 'Pulsa Enter para cerrar...'): Promise<void> {
  await question(`\n${message}`);
}

function allConfigPaths(): string[] {
  return [getClaudeCodeConfigPath(), ...resolveDesktopConfigPaths()];
}

/** Registra imprimiendo el resultado (envoltorio de registerServer). */
function registerInConfig(configPath: string, entry: McpServerEntry, label: string): boolean {
  const result = registerServer(configPath, entry);
  if (result === 'invalid-json') {
    err(`${label}: ${configPath} existe pero no es JSON válido. Lo dejo intacto.`);
    return false;
  }
  ok(`${label}: registrado en ${configPath}`);
  return true;
}

/** Elimina imprimiendo el resultado (envoltorio de removeServer). */
function removeFromConfig(configPath: string, label: string): boolean {
  const result = removeServer(configPath);
  if (result === 'invalid-json') {
    err(`${label}: ${configPath} no es JSON válido. Lo dejo intacto.`);
    return false;
  }
  if (result === 'removed') {
    ok(`${label}: eliminado de ${configPath}`);
    return true;
  }
  return false;
}

// ---------- API key ----------
/** Limpia BOM, comillas y espacios que se cuelan al pegar. */
function cleanApiKey(raw: string): string {
  const bom = String.fromCharCode(0xfeff);
  return raw.replace(bom, '').trim().replace(/^["']|["']$/g, '').trim();
}

function maskKey(key: string): string {
  return key.length > 4 ? `****${key.slice(-4)}` : '****';
}

/** Pide la API key de Holded, con validación suave (32 hex es el formato habitual). */
async function promptApiKey(): Promise<string | null> {
  const existing = findExistingApiKey(allConfigPaths());
  if (existing) {
    const ans = await question(
      `Ya hay una API key registrada (${maskKey(existing)}). Pulsa Enter para mantenerla\n` +
      'o pega una nueva > ',
    );
    const cleaned = cleanApiKey(ans);
    if (!cleaned) return existing;
    return validateKeyInteractive(cleaned);
  }

  log('\nNecesitas la API key de Holded. Se obtiene en:');
  log('  Holded > Configuracion (engranaje) > Desarrolladores > Nueva API Key\n');
  const ans = await question('API key de Holded > ');
  const cleaned = cleanApiKey(ans);
  if (!cleaned) {
    err('No se ha introducido ninguna API key. Instalacion cancelada.');
    return null;
  }
  return validateKeyInteractive(cleaned);
}

async function validateKeyInteractive(key: string): Promise<string | null> {
  if (key.length < 20) {
    err('Eso no parece una API key de Holded (demasiado corta). Instalacion cancelada.');
    return null;
  }
  if (!/^[0-9a-f]{32}$/i.test(key)) {
    warn('La key no tiene el formato habitual de Holded (32 caracteres hexadecimales).');
    const cont = await question('Continuar igualmente? (s/N) > ');
    if (!/^s/i.test(cont.trim())) return null;
  }
  return key;
}

/** Comprobación en vivo contra la API de Holded (solo lectura). */
async function testApiKey(key: string): Promise<boolean> {
  try {
    const res = await fetch('https://api.holded.com/api/invoicing/v1/contacts', {
      headers: { key, Accept: 'application/json' },
    });
    return res.ok;
  } catch {
    return false; // sin red: no bloquear la instalación
  }
}

// ---------- registro en "Agregar o quitar programas" ----------
function regAdd(name: string, type: 'REG_SZ' | 'REG_DWORD', value: string): void {
  spawnSync('reg', ['add', UNINSTALL_REG_KEY, '/v', name, '/t', type, '/d', value, '/f'], {
    stdio: 'ignore', windowsHide: true,
  });
}

/** Tamaño de la carpeta de instalación en KB (best-effort). */
function installDirSizeKb(): number {
  try {
    let bytes = 0;
    for (const f of fs.readdirSync(INSTALL_DIR)) {
      try { bytes += fs.statSync(path.join(INSTALL_DIR, f)).size; } catch { /* ignora */ }
    }
    return Math.round(bytes / 1024);
  } catch {
    return 0;
  }
}

function registerUninstallEntry(exePath: string): void {
  if (process.platform !== 'win32') return;
  try {
    const today = new Date();
    const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    regAdd('DisplayName', 'REG_SZ', `${APP_NAME} (APOGEA)`);
    regAdd('DisplayVersion', 'REG_SZ', APP_VERSION);
    regAdd('Publisher', 'REG_SZ', 'APOGEA Consultores');
    regAdd('InstallLocation', 'REG_SZ', INSTALL_DIR);
    regAdd('UninstallString', 'REG_SZ', `"${exePath}" uninstall`);
    regAdd('QuietUninstallString', 'REG_SZ', `"${exePath}" uninstall`);
    regAdd('DisplayIcon', 'REG_SZ', exePath);
    regAdd('InstallDate', 'REG_SZ', stamp);
    regAdd('URLInfoAbout', 'REG_SZ', REPO_URL);
    regAdd('NoModify', 'REG_DWORD', '1');
    regAdd('NoRepair', 'REG_DWORD', '1');
    const kb = installDirSizeKb();
    if (kb > 0) regAdd('EstimatedSize', 'REG_DWORD', String(kb));
  } catch { /* no crítico */ }
}

function unregisterUninstallEntry(): void {
  if (process.platform !== 'win32') return;
  try {
    spawnSync('reg', ['delete', UNINSTALL_REG_KEY, '/f'], { stdio: 'ignore', windowsHide: true });
  } catch { /* no crítico */ }
}

// ---------- instalación ----------
function targetExePath(): string {
  // Nombre VERSIONADO: cada actualización escribe un fichero nuevo, así nunca
  // hay que sobrescribir el .exe que Claude tiene en ejecución (bloqueado).
  return path.join(INSTALL_DIR, `${EXE_BASENAME}-${APP_VERSION}.exe`);
}

function isInstalled(): boolean {
  try {
    if (fs.existsSync(INSTALL_DIR) &&
        fs.readdirSync(INSTALL_DIR).some((f) => new RegExp(`^${EXE_BASENAME}.*\\.exe$`, 'i').test(f))) {
      return true;
    }
  } catch { /* ignora */ }
  return allConfigPaths().some((cfg) => getServerEntry(cfg) !== null);
}

interface ConfigTarget {
  path: string;
  label: string;
}

/** Destinos donde registrar, según la elección del usuario. */
async function chooseTargets(): Promise<ConfigTarget[]> {
  const code: ConfigTarget = { path: getClaudeCodeConfigPath(), label: 'Claude Code' };
  const desktop: ConfigTarget[] = resolveDesktopConfigPaths().map((p) => ({
    path: p, label: 'Claude Desktop',
  }));

  log('\nDestinos detectados:');
  log(`  - Claude Code:    ${code.path}`);
  for (const d of desktop) log(`  - Claude Desktop: ${d.path}`);
  log('\nDonde quieres registrar el servidor?');
  log('  [1] En todos (recomendado)');
  log('  [2] Solo Claude Code');
  log('  [3] Solo Claude Desktop');

  const ans = (await question('\nElige una opcion (Enter = 1) > ')).trim();
  if (ans === '2') return [code];
  if (ans === '3') return desktop;
  return [code, ...desktop];
}

function registerTargets(targets: ConfigTarget[], exePath: string, apiKey: string): void {
  const entry: McpServerEntry = {
    command: exePath,
    args: ['serve'],
    env: { HOLDED_API_KEY: apiKey },
  };
  for (const t of targets) registerInConfig(t.path, entry, t.label);
}

/** Borra binarios antiguos que ya no referencia ninguna config de Claude. */
function cleanupOldExes(currentExe: string): void {
  try {
    const referenced = new Set<string>();
    for (const cfg of allConfigPaths()) {
      const cmd = getServerEntry(cfg)?.command;
      if (typeof cmd === 'string') referenced.add(path.resolve(cmd).toLowerCase());
    }
    for (const f of fs.readdirSync(INSTALL_DIR)) {
      if (!new RegExp(`^${EXE_BASENAME}.*\\.exe$`, 'i').test(f)) continue;
      const fp = path.resolve(path.join(INSTALL_DIR, f));
      if (fp.toLowerCase() === path.resolve(currentExe).toLowerCase()) continue;
      if (referenced.has(fp.toLowerCase())) continue; // aún en uso por alguna config
      try { fs.rmSync(fp, { force: true }); } catch { /* en uso: otra ocasión */ }
    }
  } catch { /* no crítico */ }
}

/** Aviso destacado: hay que reiniciar Claude para que aplique. */
function printRestartNotice(): void {
  log(`\n${c.yellow}${c.bold}  IMPORTANTE — reinicia Claude para que aplique:${c.reset}`);
  log(`${c.yellow}  1) ${c.bold}Claude Desktop${c.reset}${c.yellow}: cierralo del TODO desde la bandeja del sistema`);
  log(`     (junto al reloj) > clic derecho en el icono > Salir/Quit.`);
  log(`     Cerrar la ventana con la X NO basta. Luego vuelve a abrirlo.`);
  log(`  2) ${c.bold}Claude Code${c.reset}${c.yellow}: cierra y vuelve a abrir la aplicacion o terminal.${c.reset}`);
}

async function cmdInstall(): Promise<void> {
  banner('Instalador');
  log('Conecta Claude con Holded: facturas, presupuestos, contactos, productos y CRM.\n');

  const TOTAL = 4;
  const selfPath = process.execPath;
  const targetExe = targetExePath();

  // 1. API key
  step(1, TOTAL, 'API key de Holded');
  const apiKey = await promptApiKey();
  if (!apiKey) {
    await pause();
    process.exit(1);
  }
  process.stdout.write('Comprobando la key contra la API de Holded... ');
  if (await testApiKey(apiKey)) {
    log('OK');
  } else {
    log('');
    warn('No se pudo validar la key (sin red o key incorrecta). Se instala igualmente;');
    warn('si Claude da error 401/403, reinstala con la key correcta.');
  }

  // 2. Copiar el ejecutable a C:\Holded-MCP (nombre versionado)
  step(2, TOTAL, `Instalando el ejecutable en ${INSTALL_DIR}`);
  try {
    if (!fs.existsSync(INSTALL_DIR)) fs.mkdirSync(INSTALL_DIR, { recursive: true });
    if (path.resolve(selfPath).toLowerCase() !== path.resolve(targetExe).toLowerCase()) {
      fs.copyFileSync(selfPath, targetExe);
      ok(`Instalado: ${targetExe}`);
    } else {
      ok('Ya se esta ejecutando desde la ubicacion de instalacion.');
    }
  } catch (e: any) {
    if (fs.existsSync(targetExe)) {
      ok('Esta version ya estaba instalada.');
    } else {
      err(`No se pudo copiar el ejecutable: ${e.message}`);
      await pause();
      process.exit(1);
    }
  }

  // 3. Registrar en Claude (ANTES de limpiar, para que ninguna config quede
  //    apuntando a un binario borrado)
  step(3, TOTAL, 'Registrando en Claude');
  const targets = await chooseTargets();
  registerTargets(targets, targetExe, apiKey);
  cleanupOldExes(targetExe);

  // 4. Alta en "Agregar o quitar programas"
  step(4, TOTAL, 'Registrando el desinstalador en Windows');
  registerUninstallEntry(targetExe);
  ok('Aparece en Configuracion > Aplicaciones como "Holded MCP (APOGEA)".');

  log(`\n${c.green}${c.bold}Instalacion completada.${c.reset}`);
  printRestartNotice();
  await pause();
}

// ---------- desinstalación ----------
/** Programa el borrado del propio .exe tras salir (Windows no puede borrar un exe en uso). */
function scheduleSelfDelete(exePath: string): void {
  if (process.platform !== 'win32') return;
  const dir = path.dirname(exePath);
  const cmd = `ping 127.0.0.1 -n 3 > nul & del /f /q "${exePath}" & rmdir "${dir}" 2>nul`;
  try {
    spawn('cmd', ['/c', cmd], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  } catch { /* si falla, queda el binario; no es crítico */ }
}

async function cmdUninstall(): Promise<void> {
  banner('Desinstalador');

  // 1. Quitar de todas las configs de Claude
  step(1, 3, 'Quitando el registro de Claude');
  let removed = 0;
  if (removeFromConfig(getClaudeCodeConfigPath(), 'Claude Code')) removed++;
  for (const target of resolveDesktopConfigPaths()) {
    if (removeFromConfig(target, 'Claude Desktop')) removed++;
  }
  if (removed === 0) warn(`No se encontro '${MCP_KEY}' en ninguna config de Claude.`);

  // 2. Quitar de "Agregar o quitar programas"
  step(2, 3, 'Quitando el registro de Windows');
  unregisterUninstallEntry();
  ok('Entrada de "Agregar o quitar programas" eliminada.');

  // 3. Borrar la carpeta de instalación
  step(3, 3, `Eliminando ${INSTALL_DIR}`);
  const runningFromDir =
    path.resolve(process.execPath).toLowerCase().startsWith(path.resolve(INSTALL_DIR).toLowerCase());
  try {
    if (fs.existsSync(INSTALL_DIR)) {
      for (const f of fs.readdirSync(INSTALL_DIR)) {
        const fp = path.join(INSTALL_DIR, f);
        if (path.resolve(fp).toLowerCase() === path.resolve(process.execPath).toLowerCase()) continue;
        fs.rmSync(fp, { recursive: true, force: true });
      }
      if (!runningFromDir) {
        fs.rmSync(INSTALL_DIR, { recursive: true, force: true });
        ok(`Carpeta eliminada: ${INSTALL_DIR}`);
      } else {
        ok('La carpeta se eliminara al cerrar esta ventana (el .exe esta en uso).');
      }
    } else {
      warn(`No existe ${INSTALL_DIR}.`);
    }
  } catch (e: any) {
    warn(`No se pudo borrar la carpeta: ${e.message}`);
  }

  log(`\n${c.green}${c.bold}Desinstalacion completada.${c.reset}`);
  log('Los backups de las configs de Claude (*.bak) se conservan por si acaso.');
  printRestartNotice();

  if (runningFromDir) scheduleSelfDelete(process.execPath);
  await pause();
}

// ---------- estado ----------
function cmdStatus(): void {
  log(`\n${c.bold}${APP_NAME} v${APP_VERSION} — Estado${c.reset}\n`);

  // Binarios instalados
  if (fs.existsSync(INSTALL_DIR)) {
    const exes = fs.readdirSync(INSTALL_DIR).filter((f) => /\.exe$/i.test(f));
    if (exes.length) {
      ok(`Instalado en ${INSTALL_DIR}: ${exes.join(', ')}`);
    } else {
      warn(`${INSTALL_DIR} existe pero no contiene ejecutables.`);
    }
  } else {
    warn(`No instalado (no existe ${INSTALL_DIR}).`);
  }

  // Configs de Claude
  const labels = new Map<string, string>([[getClaudeCodeConfigPath(), 'Claude Code']]);
  for (const p of resolveDesktopConfigPaths()) labels.set(p, 'Claude Desktop');
  let found = 0;
  for (const [cfg, label] of labels) {
    const entry = getServerEntry(cfg);
    if (entry) {
      found++;
      const key = entry?.env?.HOLDED_API_KEY;
      ok(`${label}: registrado en ${cfg}`);
      log(`     command: ${entry.command}`);
      log(`     api key: ${typeof key === 'string' ? maskKey(key) : '(no definida)'}`);
    }
  }
  if (found === 0) warn('No esta registrado en ninguna config de Claude.');
}

// ---------- menú ----------
async function cmdMenu(): Promise<void> {
  banner(`v${APP_VERSION}`);
  log(isInstalled() ? 'Estado: ya instalado.\n' : 'Estado: no instalado.\n');
  log('  [1] Instalar / actualizar');
  log('  [2] Ver estado');
  log('  [3] Desinstalar');
  log('  [4] Salir');

  const ans = (await question('\nElige una opcion (1-4) > ')).trim();
  if (ans === '1') await cmdInstall();
  else if (ans === '2') { cmdStatus(); await pause(); }
  else if (ans === '3') await cmdUninstall();
  else log('Saliendo sin cambios.');
}

// ---------- dispatcher ----------
async function main(): Promise<void> {
  const cmd = process.argv[2];

  switch (cmd) {
    case 'serve': {
      // Modo servidor MCP: lo lanza Claude por stdio. Nada de menús ni stdout.
      const { runServer } = await import('./server.js');
      await runServer();
      break;
    }
    case 'install':
      await cmdInstall();
      process.exit(0);
    case 'uninstall':
      await cmdUninstall();
      process.exit(0);
    case 'register': {
      const key = findExistingApiKey(allConfigPaths()) ?? (await promptApiKey());
      if (!key) process.exit(1);
      const targets = await chooseTargets();
      registerTargets(targets, targetExePath(), key);
      process.exit(0);
    }
    case 'status':
      cmdStatus();
      process.exit(0);
    case undefined:
      await cmdMenu();
      process.exit(0);
    default:
      err(`Comando desconocido: ${cmd}`);
      log('Comandos: (sin args)=menu | install | uninstall | register | status | serve');
      process.exit(1);
  }
}

main().catch((e) => {
  console.error('Error:', e?.message ?? e);
  process.exit(1);
});
