# Desinstalación manual de Holded MCP

La vía normal es ejecutar el desinstalador: doble clic en `C:\Holded-MCP\holded-mcp-<versión>.exe` → opción `[3] Desinstalar`, o desde **Configuración > Aplicaciones > "Holded MCP (APOGEA)" > Desinstalar**.

Si has perdido el `.exe` o algo falló, puedes limpiar a mano:

## 1. Quitar la entrada de las configs de Claude

Abre cada uno de estos ficheros (los que existan) y elimina el bloque `"holded": { ... }` de dentro de `"mcpServers"`:

| Caso de uso | Fichero |
|-------------|---------|
| Claude Code | `%USERPROFILE%\.claude.json` |
| Claude Desktop (instalador clásico) | `%APPDATA%\Claude\claude_desktop_config.json` |
| Claude Desktop (variante Local) | `%LOCALAPPDATA%\Claude\claude_desktop_config.json` |
| Claude Desktop (Microsoft Store) | `%LOCALAPPDATA%\Packages\Claude_*\LocalCache\Roaming\Claude*\claude_desktop_config.json` |

> El instalador crea backups con timestamp (`*.bak`) junto a cada config antes de tocarla. Si algo se rompió, restaura el `.bak` más reciente.

## 2. Quitar la entrada de "Agregar o quitar programas"

En una terminal:

```
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Holded-MCP" /f
```

## 3. Borrar la carpeta de instalación

```
rmdir /s /q C:\Holded-MCP
```

Si Windows dice que el `.exe` está en uso, cierra Claude Desktop del todo (bandeja del sistema → clic derecho → Salir) y cualquier sesión de Claude Code, y repite.

## 4. Reiniciar Claude

Reinicia Claude Desktop (salir del todo desde la bandeja) y Claude Code para que dejen de intentar cargar el servidor.

La API key de Holded solo vive en las configs de Claude; al quitar las entradas del paso 1 no queda ninguna credencial en el equipo. Si quieres, revoca además la key en Holded: **Configuración > Desarrolladores**.
