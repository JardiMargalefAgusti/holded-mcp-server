# holded-mcp-server

Servidor MCP (Model Context Protocol) para integrar **Holded** con **Claude Code**, **Claude Desktop** y cualquier cliente MCP compatible.

Expone 25 herramientas (tools) que cubren: facturas de venta, facturas de compra, presupuestos, contactos y productos.

Desarrollado por **APOGEA Consultores** (Agustí Jardí).

## Requisitos previos

- **Node.js** >= 18 ([descargar](https://nodejs.org/))
- **API Key de Holded** (ver [Cómo obtener la API Key](#cómo-obtener-la-api-key-de-holded))

## Instalación

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

## Configuración con Claude Code

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

## Configuración con Claude Desktop

Edita el fichero de configuración de Claude Desktop:

| Sistema | Ruta del fichero |
|---------|------------------|
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` |

Añade dentro de `"mcpServers"`:

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

Reinicia Claude Desktop para que detecte el nuevo servidor.

## Tools disponibles (25)

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

### Facturas de Compra (6)
| Tool | Descripción |
|------|-------------|
| `holded_list_purchases` | Lista facturas de compra (gastos) |
| `holded_get_purchase` | Detalle de una factura de compra |
| `holded_create_purchase` | Registra una nueva factura de compra |
| `holded_update_purchase` | Actualiza una factura de compra |
| `holded_delete_purchase` | Elimina una factura de compra |
| `holded_pay_purchase` | Registra un pago a proveedor |

### Presupuestos (6)
| Tool | Descripción |
|------|-------------|
| `holded_list_estimates` | Lista presupuestos. Filtros: fecha, contacto |
| `holded_get_estimate` | Detalle de un presupuesto |
| `holded_create_estimate` | Crea un nuevo presupuesto |
| `holded_update_estimate` | Actualiza un presupuesto existente |
| `holded_delete_estimate` | Elimina un presupuesto |
| `holded_send_estimate` | Envía un presupuesto por email |

## Ejemplos de uso

Una vez conectado, puedes hacer peticiones en lenguaje natural a Claude:

- *"Busca el contacto Empresa ABC en Holded"*
- *"Lista mis facturas de venta del último mes"*
- *"Crea una factura para el cliente X con 2 horas de consultoría a 80 EUR/hora"*
- *"Registra el pago de la factura F-2026-001 por 4.235 EUR"*
- *"Envía el presupuesto P-2026-003 al email cliente@empresa.com"*
- *"Muéstrame las facturas de compra pendientes de pago"*

## Desarrollo

```bash
npm run dev    # Compilación en modo watch (detecta cambios automáticamente)
npm run build  # Compilación completa
```

### Estructura del proyecto

```
src/
├── index.ts              # Entry point (McpServer + StdioServerTransport)
├── holded-client.ts      # Cliente HTTP para la API de Holded
├── types/
│   └── holded.ts         # Interfaces TypeScript
└── tools/
    ├── contacts.ts       # 3 tools de contactos
    ├── products.ts       # 2 tools de productos
    ├── invoices.ts       # 8 tools de facturas de venta
    ├── purchases.ts      # 6 tools de facturas de compra
    └── estimates.ts      # 6 tools de presupuestos
```

## Cómo obtener la API Key de Holded

1. Inicia sesión en [Holded](https://app.holded.com/)
2. Ve a **Configuración** (icono engranaje) > **Desarrolladores**
3. Haz click en **Nueva API Key**
4. Copia la clave generada y úsala como `HOLDED_API_KEY`

> La API key da acceso a los datos de tu cuenta de Holded. No la compartas ni la subas a repositorios públicos.

## Solución de problemas

| Problema | Solución |
|----------|----------|
| El servidor no aparece en `/mcp` | Verifica que la ruta a `build/index.js` es correcta y absoluta |
| Error `HOLDED_API_KEY is required` | Añade la variable `env.HOLDED_API_KEY` en la configuración MCP |
| Error `401` o `403` de la API | La API key es incorrecta o ha expirado. Genera una nueva en Holded |
| Error `429` (rate limit) | El servidor reintenta automáticamente. Si persiste, espera unos segundos |
| No compila (`npm run build` falla) | Asegúrate de tener Node.js >= 18 y haber ejecutado `npm install` |

## Licencia

MIT
