/**
 * Lectura, parcheo y limpieza de las configs de Claude (Code y Desktop).
 * Lógica pura y testeable: sin console.log, los mensajes los pone quien llama.
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export const MCP_KEY = 'holded';
const CONFIG_FILE = 'claude_desktop_config.json';

export interface McpServerEntry {
  command: string;
  args: string[];
  env: { HOLDED_API_KEY: string };
}

export type PatchResult = 'ok' | 'invalid-json';
export type RemoveResult = 'removed' | 'absent' | 'invalid-json';

/**
 * Rutas de claude_desktop_config.json donde registrar. En Windows, Claude
 * Desktop puede vivir en tres sitios:
 *   1) Instalador clásico   → %APPDATA%\Claude
 *   2) Variante Local       → %LOCALAPPDATA%\Claude
 *   3) Microsoft Store/MSIX → %LOCALAPPDATA%\Packages\*claude*\LocalCache\Roaming\<Claude*>
 */
export function resolveDesktopConfigPaths(): string[] {
  const targets: string[] = [];

  if (process.platform === 'win32') {
    const roaming = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');

    const baseDirs: string[] = [path.join(roaming, 'Claude'), path.join(local, 'Claude')];

    const pkgRoot = path.join(local, 'Packages');
    try {
      if (fs.existsSync(pkgRoot)) {
        for (const pkg of fs.readdirSync(pkgRoot)) {
          if (!/claude/i.test(pkg)) continue;
          const roamingInPkg = path.join(pkgRoot, pkg, 'LocalCache', 'Roaming');
          if (!fs.existsSync(roamingInPkg)) continue;
          for (const sub of fs.readdirSync(roamingInPkg)) {
            if (/^claude/i.test(sub)) baseDirs.push(path.join(roamingInPkg, sub));
          }
        }
      }
    } catch { /* sin permisos o estructura inesperada: se ignora */ }

    // Solo carpetas que existen (no crear configs huérfanos)
    for (const dir of baseDirs) {
      if (fs.existsSync(dir)) targets.push(path.join(dir, CONFIG_FILE));
    }
    // Fallback: si no se detectó ninguna instalación, la ruta clásica
    if (targets.length === 0) targets.push(path.join(roaming, 'Claude', CONFIG_FILE));
  } else if (process.platform === 'darwin') {
    targets.push(path.join(os.homedir(), 'Library', 'Application Support', 'Claude', CONFIG_FILE));
  } else {
    const xdg = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    targets.push(path.join(xdg, 'Claude', CONFIG_FILE));
  }

  return [...new Set(targets.map((p) => path.normalize(p)))];
}

export function getClaudeCodeConfigPath(): string {
  return path.join(os.homedir(), '.claude.json');
}

export function readConfig(configPath: string): Record<string, unknown> | null {
  if (!fs.existsSync(configPath)) return {};
  try {
    const raw = fs.readFileSync(configPath, 'utf-8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return null; // JSON inválido: no tocar
  }
}

export function backupConfig(configPath: string): string | null {
  if (!fs.existsSync(configPath)) return null;
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = `${configPath}.${ts}.bak`;
  fs.copyFileSync(configPath, backup);
  return backup;
}

/** Escritura atómica: temporal + rename, para no dejar un JSON a medias. */
export function writeConfig(configPath: string, data: Record<string, unknown>): void {
  const tmp = `${configPath}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, configPath);
}

/** Inserta/actualiza la entrada MCP_KEY preservando el resto del config. */
export function registerServer(configPath: string, entry: McpServerEntry): PatchResult {
  const configDir = path.dirname(configPath);
  if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });

  const config = readConfig(configPath);
  if (config === null) return 'invalid-json';
  backupConfig(configPath);

  if (!config.mcpServers || typeof config.mcpServers !== 'object') config.mcpServers = {};
  (config.mcpServers as Record<string, unknown>)[MCP_KEY] = entry;

  writeConfig(configPath, config);
  return 'ok';
}

/** Elimina la entrada MCP_KEY (con backup). El resto del config queda intacto. */
export function removeServer(configPath: string): RemoveResult {
  if (!fs.existsSync(configPath)) return 'absent';
  const config = readConfig(configPath);
  if (config === null) return 'invalid-json';
  const servers = config.mcpServers as Record<string, unknown> | undefined;
  if (!servers || !servers[MCP_KEY]) return 'absent';

  backupConfig(configPath);
  delete servers[MCP_KEY];
  writeConfig(configPath, config);
  return 'removed';
}

/** Devuelve la entrada MCP_KEY de un config, si existe. */
export function getServerEntry(configPath: string): Record<string, any> | null {
  const config = readConfig(configPath);
  const entry = (config?.mcpServers as Record<string, any> | undefined)?.[MCP_KEY];
  return entry ?? null;
}

/** Busca una API key ya registrada en alguna de las rutas dadas. */
export function findExistingApiKey(paths: string[]): string | null {
  for (const cfg of paths) {
    const key = getServerEntry(cfg)?.env?.HOLDED_API_KEY;
    if (typeof key === 'string' && key.length > 0) return key;
  }
  return null;
}
