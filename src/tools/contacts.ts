import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HoldedClient } from '../holded-client.js';

export function registerContactTools(server: McpServer, client: HoldedClient): void {
  server.tool(
    'holded_list_contacts',
    'Lista todos los contactos de Holded (clientes, proveedores, etc.)',
    {},
    async () => {
      try {
        const contacts = await client.listContacts();
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(contacts, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'holded_get_contact',
    'Obtiene los detalles de un contacto específico por su ID.',
    {
      contactId: z.string().describe('ID del contacto en Holded'),
    },
    async ({ contactId }) => {
      try {
        const contact = await client.getContact(contactId);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(contact, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );

  server.tool(
    'holded_search_contacts',
    'Busca contactos por nombre (búsqueda parcial, no sensible a mayúsculas). Útil para encontrar el ID de un cliente o proveedor antes de crear facturas o presupuestos.',
    {
      query: z.string().describe('Texto a buscar en el nombre del contacto'),
    },
    async ({ query }) => {
      try {
        const contacts = await client.listContacts();
        const filtered = (contacts as Array<{ name?: string }>).filter((c) =>
          c.name?.toLowerCase().includes(query.toLowerCase())
        );
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(filtered, null, 2) }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    }
  );
}
