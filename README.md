# holded-mcp-server

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)
[![MCP SDK](https://img.shields.io/badge/MCP_SDK-1.27-purple.svg)](https://modelcontextprotocol.io/)

Servidor MCP (Model Context Protocol) para integrar **[Holded](https://www.holded.com/)** con **Claude Code**, **Claude Desktop** y cualquier cliente MCP compatible.

Expone **43 herramientas** (tools) que cubren: facturas de venta, facturas de compra, presupuestos, contactos y productos de la API de facturación de Holded, además del módulo **CRM** (leads y embudos de venta).

Desarrollado por **[APOGEA Consultores](https://apogea.pro/)** (Agustí Jardí).

## Requisitos previos

- **Node.js** >= 18 ([descargar](https://nodejs.org/))
- **Git** ([descargar](https://git-scm.com/))
- **API Key de Holded** (ver [Cómo obtener la API Key](#cómo-obtener-la-api-key-de-holded))
- **Claude Code** o **Claude Desktop** instalado

## Instalación

### Opción A — Instalador .exe (recomendado, sin requisitos)

Descarga `holded-mcp.exe` (o genéralo con `npm run build:exe`) y haz **doble clic**:

1. Pide la **API key de Holded** (y la valida en vivo contra la API).
2. Instala el ejecutable en `C:\Holded-MCP\` (no necesita Node.js: lo lleva embebido).
3. Registra el servidor automáticamente en **Claude Code** (`~/.claude.json`) y en **Claude Desktop** (detecta las 3 variantes de Windows: instalador clásico, Local y Microsoft Store), con backup previo de cada config.
4. Se da de alta en **"Agregar o quitar programas"** para desinstalarlo desde Windows.

Reinicia Claude (Desktop: salir del todo desde la bandeja del sistema) y listo.

El mismo `.exe` es también el **desinstalador**: doble clic → opción `[3] Desinstalar` (o desde "Agregar o quitar programas"). Elimina las entradas de las configs de Claude (con backup), el registro de Windows y la carpeta `C:\Holded-MCP`.

Otros comandos del exe: `holded-mcp.exe status` (dónde está registrado), `register`, `install`, `uninstall`.

### Opción B — Manual con Node.js

```bash
# 1. Clonar el repositorio
git clone https://github.com/JardiMargalefAgusti/holded-mcp-server.git
cd holded-mcp-server

# 2. Instalar dependencias
npm install

# 3. Compilar
npm run build
```

Tras estos pasos, el servidor estará listo en `build/index.js`.

## Configuración

### Con Claude Code

Añade la siguiente entrada al fichero `.mcp.json` de tu proyecto (o a `~/.claude.json` para que esté disponible en todos los proyectos):

```json
{
  "mcpServers": {
    "holded": {
      "command": "node",
      "args": ["/ruta/absoluta/a/holded-mcp-server/build/index.js"],
      "env": {
        "HOLDED_API_KEY": "tu_api_key_aqui"
      }
    }
  }
}
```

> **Windows**: usa rutas con doble barra `\\`, por ejemplo:
> `"args": ["C:\\Users\\usuario\\holded-mcp-server\\build\\index.js"]`

Reinicia Claude Code y comprueba que funciona con el comando `/mcp` — el servidor `holded` debe aparecer como **connected**.

### Con Claude Desktop

Edita el fichero de configuración de Claude Desktop:

| Sistema | Ruta del fichero |
|---------|------------------|
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` |

Añade dentro de `"mcpServers"`:

```json
"holded": {
  "command": "node",
  "args": ["/ruta/absoluta/a/holded-mcp-server/build/index.js"],
  "env": {
    "HOLDED_API_KEY": "tu_api_key_aqui"
  }
}
```

Reinicia Claude Desktop para que detecte el nuevo servidor.

## Tools disponibles (43)

### Contactos (3)
| Tool | Descripción |
|------|-------------|
| `holded_list_contacts` | Lista todos los contactos (clientes, proveedores, etc.) |
| `holded_get_contact` | Obtiene los detalles de un contacto por su ID |
| `holded_search_contacts` | Busca contactos por nombre (búsqueda parcial) |

### Productos (2)
| Tool | Descripción |
|------|-------------|
| `holded_list_products` | Lista todos los productos y servicios |
| `holded_get_product` | Obtiene los detalles de un producto por su ID |

### Facturas de Venta (8)
| Tool | Descripción |
|------|-------------|
| `holded_list_invoices` | Lista facturas. Filtros: fecha inicio/fin, contacto |
| `holded_get_invoice` | Detalle completo de una factura |
| `holded_create_invoice` | Crea una nueva factura de venta |
| `holded_update_invoice` | Actualiza una factura existente |
| `holded_delete_invoice` | Elimina una factura |
| `holded_pay_invoice` | Registra un pago en una factura |
| `holded_send_invoice` | Envía una factura por email |
| `holded_get_invoice_pdf` | Obtiene el PDF de la factura (base64) |

### Facturas de Compra (7)
| Tool | Descripción |
|------|-------------|
| `holded_list_purchases` | Lista facturas de compra (gastos) |
| `holded_get_purchase` | Detalle de una factura de compra |
| `holded_create_purchase` | Registra una nueva factura de compra |
| `holded_update_purchase` | Actualiza una factura de compra |
| `holded_delete_purchase` | Elimina una factura de compra |
| `holded_pay_purchase` | Registra un pago a proveedor |
| `holded_get_purchase_pdf` | Descarga el PDF de una factura de compra (base64) |

### Presupuestos (6)
| Tool | Descripción |
|------|-------------|
| `holded_list_estimates` | Lista presupuestos. Filtros: fecha, contacto |
| `holded_get_estimate` | Detalle de un presupuesto |
| `holded_create_estimate` | Crea un nuevo presupuesto |
| `holded_update_estimate` | Actualiza un presupuesto existente |
| `holded_delete_estimate` | Elimina un presupuesto |
| `holded_send_estimate` | Envía un presupuesto por email |

### CRM — Embudos (5)
| Tool | Descripción |
|------|-------------|
| `holded_list_funnels` | Lista los embudos del CRM con sus etapas |
| `holded_get_funnel` | Detalle de un embudo por su ID |
| `holded_create_funnel` | Crea un nuevo embudo |
| `holded_update_funnel` | Actualiza un embudo existente |
| `holded_delete_funnel` | Elimina un embudo |

### CRM — Leads (12)
| Tool | Descripción |
|------|-------------|
| `holded_list_leads` | Lista los leads (oportunidades de venta) |
| `holded_get_lead` | Detalle completo de un lead (notas y tareas incluidas) |
| `holded_create_lead` | Crea un nuevo lead |
| `holded_update_lead` | Actualiza un lead existente |
| `holded_delete_lead` | Elimina un lead |
| `holded_update_lead_stage` | Mueve un lead a otra etapa del embudo |
| `holded_update_lead_dates` | Actualiza las fechas de un lead |
| `holded_create_lead_note` | Añade una nota a un lead |
| `holded_update_lead_note` | Actualiza una nota de un lead |
| `holded_create_lead_task` | Crea una tarea asociada a un lead |
| `holded_update_lead_task` | Actualiza una tarea de un lead |
| `holded_delete_lead_task` | Elimina una tarea de un lead |

## Ejemplos de uso

Una vez conectado, puedes hacer peticiones en lenguaje natural a Claude:

- *"Busca el contacto Empresa ABC en Holded"*
- *"Lista mis facturas de venta del último mes"*
- *"Crea una factura para el cliente X con 2 horas de consultoría a 80 EUR/hora"*
- *"Registra el pago de la factura F-2026-001 por 4.235 EUR"*
- *"Envía el presupuesto P-2026-003 al email cliente@empresa.com"*
- *"Muéstrame las facturas de compra pendientes de pago"*
- *"Crea un lead para Empresa ABC en el embudo Comercial y añade una nota con lo hablado hoy"*
- *"Mueve el lead de Empresa XYZ a la etapa Negociación"*

## Cómo obtener la API Key de Holded

1. Inicia sesión en [Holded](https://app.holded.com/)
2. Ve a **Configuración** (icono engranaje) > **Desarrolladores**
3. Haz click en **Nueva API Key**
4. Copia la clave generada y úsala como `HOLDED_API_KEY`

> **Seguridad**: La API key da acceso a los datos de facturación de tu cuenta de Holded. Guárdala siempre como variable de entorno y nunca la incluyas directamente en el código fuente.

## Desarrollo

```bash
npm run dev        # Compilación en modo watch (detecta cambios automáticamente)
npm run build      # Compilación completa
npm run build:exe  # Genera dist-exe/holded-mcp.exe (tsc + esbuild + @yao-pkg/pkg)
```

El `.exe` es autocontenido (Node 22 embebido, ~80 MB) y actúa como instalador, desinstalador y servidor MCP según cómo se invoque: doble clic → menú; `serve` (lo que lanza Claude) → servidor por stdio. El binario se instala con nombre versionado (`holded-mcp-1.1.0.exe`) para que las actualizaciones nunca choquen con un exe en uso por Claude.

### Estructura del proyecto

```
src/
├── index.ts              # Entry point para Node (llama a runServer)
├── server.ts             # runServer(): McpServer + registro de tools + stdio
├── main.ts               # Entry point del .exe (instalador/desinstalador/serve)
├── holded-client.ts      # Cliente HTTP para la API de Holded (retry 429)
├── types/
│   └── holded.ts         # Interfaces TypeScript
└── tools/
    ├── contacts.ts       # 3 tools de contactos
    ├── products.ts       # 2 tools de productos
    ├── invoices.ts       # 8 tools de facturas de venta
    ├── purchases.ts      # 7 tools de facturas de compra
    ├── estimates.ts      # 6 tools de presupuestos
    └── crm.ts            # 17 tools de CRM (leads y embudos)
```

### Stack técnico

- **Runtime**: Node.js >= 18
- **Lenguaje**: TypeScript (strict mode)
- **SDK**: [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) v1.27+
- **Validación**: [zod](https://zod.dev/) v4
- **Transporte**: stdio (JSON-RPC)
- **HTTP**: fetch nativo (Node 18+)

## Solución de problemas

| Problema | Solución |
|----------|----------|
| El servidor no aparece en `/mcp` | Verifica que la ruta a `build/index.js` es correcta y absoluta |
| Error `HOLDED_API_KEY is required` | Añade la variable `env.HOLDED_API_KEY` en la configuración MCP |
| Error `401` o `403` de la API | La API key es incorrecta o ha expirado. Genera una nueva en Holded |
| Error `429` (rate limit) | El servidor reintenta automáticamente. Si persiste, espera unos segundos |
| No compila (`npm run build` falla) | Asegúrate de tener Node.js >= 18 y haber ejecutado `npm install` |

## Contribuir

Las contribuciones son bienvenidas. Abre un [issue](https://github.com/JardiMargalefAgusti/holded-mcp-server/issues) o envía un pull request.

## Licencia

[MIT](LICENSE) - APOGEA Consultores
