/**
 * Tests del parcheador de configs de Claude (node:test).
 * Ejecutar con: npm test
 */
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  MCP_KEY,
  registerServer,
  removeServer,
  readConfig,
  getServerEntry,
  findExistingApiKey,
  type McpServerEntry,
} from './claude-config.js';

const ENTRY: McpServerEntry = {
  command: 'C:\\Holded-MCP\\holded-mcp-1.1.0.exe',
  args: ['serve'],
  env: { HOLDED_API_KEY: 'a'.repeat(32) },
};

function tmpConfig(name = 'config.json'): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'holded-cfg-'));
  return path.join(dir, name);
}

function listBackups(configPath: string): string[] {
  return fs.readdirSync(path.dirname(configPath)).filter((f) => f.endsWith('.bak'));
}

test('registra en un config inexistente creándolo', () => {
  const cfg = tmpConfig();
  assert.equal(registerServer(cfg, ENTRY), 'ok');
  const data = JSON.parse(fs.readFileSync(cfg, 'utf-8'));
  assert.deepEqual(data.mcpServers[MCP_KEY], ENTRY);
});

test('crea el directorio del config si no existe', () => {
  const cfg = path.join(tmpConfig(), 'sub', 'dir', 'config.json');
  assert.equal(registerServer(cfg, ENTRY), 'ok');
  assert.ok(fs.existsSync(cfg));
});

test('preserva los demás servidores MCP y claves del config', () => {
  const cfg = tmpConfig();
  fs.writeFileSync(cfg, JSON.stringify({
    theme: 'dark',
    mcpServers: { otro: { command: 'node', args: ['x.js'] } },
  }));
  registerServer(cfg, ENTRY);
  const data = JSON.parse(fs.readFileSync(cfg, 'utf-8'));
  assert.equal(data.theme, 'dark');
  assert.deepEqual(data.mcpServers.otro, { command: 'node', args: ['x.js'] });
  assert.deepEqual(data.mcpServers[MCP_KEY], ENTRY);
});

test('crea backup antes de modificar un config existente', () => {
  const cfg = tmpConfig();
  fs.writeFileSync(cfg, '{"mcpServers":{}}');
  registerServer(cfg, ENTRY);
  assert.equal(listBackups(cfg).length, 1);
});

test('no crea backup si el config no existía', () => {
  const cfg = tmpConfig();
  registerServer(cfg, ENTRY);
  assert.equal(listBackups(cfg).length, 0);
});

test('rechaza tocar un config con JSON inválido', () => {
  const cfg = tmpConfig();
  fs.writeFileSync(cfg, '{esto no es json');
  assert.equal(registerServer(cfg, ENTRY), 'invalid-json');
  assert.equal(fs.readFileSync(cfg, 'utf-8'), '{esto no es json');
  assert.equal(listBackups(cfg).length, 0);
});

test('actualiza una entrada existente sin duplicarla', () => {
  const cfg = tmpConfig();
  registerServer(cfg, ENTRY);
  const nueva = { ...ENTRY, env: { HOLDED_API_KEY: 'b'.repeat(32) } };
  registerServer(cfg, nueva);
  const data = JSON.parse(fs.readFileSync(cfg, 'utf-8'));
  assert.equal(Object.keys(data.mcpServers).length, 1);
  assert.equal(data.mcpServers[MCP_KEY].env.HOLDED_API_KEY, 'b'.repeat(32));
});

test('removeServer elimina la entrada y conserva el resto', () => {
  const cfg = tmpConfig();
  fs.writeFileSync(cfg, JSON.stringify({
    mcpServers: { [MCP_KEY]: ENTRY, otro: { command: 'node' } },
  }));
  assert.equal(removeServer(cfg), 'removed');
  const data = JSON.parse(fs.readFileSync(cfg, 'utf-8'));
  assert.equal(data.mcpServers[MCP_KEY], undefined);
  assert.deepEqual(data.mcpServers.otro, { command: 'node' });
  assert.equal(listBackups(cfg).length, 1);
});

test('removeServer sobre config sin la entrada devuelve absent y no hace backup', () => {
  const cfg = tmpConfig();
  fs.writeFileSync(cfg, '{"mcpServers":{"otro":{}}}');
  assert.equal(removeServer(cfg), 'absent');
  assert.equal(listBackups(cfg).length, 0);
});

test('removeServer sobre fichero inexistente devuelve absent', () => {
  assert.equal(removeServer(tmpConfig()), 'absent');
});

test('removeServer rechaza JSON inválido', () => {
  const cfg = tmpConfig();
  fs.writeFileSync(cfg, 'nope');
  assert.equal(removeServer(cfg), 'invalid-json');
});

test('ciclo completo instalar+desinstalar deja el config como estaba', () => {
  const cfg = tmpConfig();
  const original = { mcpServers: { otro: { command: 'node' } }, foo: 1 };
  fs.writeFileSync(cfg, JSON.stringify(original));
  registerServer(cfg, ENTRY);
  removeServer(cfg);
  assert.deepEqual(JSON.parse(fs.readFileSync(cfg, 'utf-8')), original);
});

test('readConfig devuelve {} para fichero vacío', () => {
  const cfg = tmpConfig();
  fs.writeFileSync(cfg, '   ');
  assert.deepEqual(readConfig(cfg), {});
});

test('findExistingApiKey encuentra la key en la primera config que la tenga', () => {
  const sin = tmpConfig();
  const con = tmpConfig();
  fs.writeFileSync(sin, '{"mcpServers":{}}');
  registerServer(con, ENTRY);
  assert.equal(findExistingApiKey([sin, con]), 'a'.repeat(32));
  assert.equal(findExistingApiKey([sin]), null);
});

test('getServerEntry devuelve null si no hay entrada', () => {
  assert.equal(getServerEntry(tmpConfig()), null);
});
