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
    'holded_create_contact',
    'Crea un nuevo contacto en Holded (cliente, proveedor, lead...). Antes de crear, busca con holded_search_contacts para evitar duplicados.',
    {
      name: z.string().describe('Nombre o razón social del contacto'),
      code: z.string().optional().describe('NIF/CIF/VAT del contacto'),
      email: z.string().optional().describe('Email del contacto'),
      type: z
        .enum(['client', 'supplier', 'lead', 'debtor', 'creditor'])
        .optional()
        .describe('Tipo de contacto (por defecto Holded lo crea genérico)'),
      isperson: z.boolean().optional().describe('true si es persona física, false si es empresa'),
      phone: z.string().optional().describe('Teléfono fijo'),
      mobile: z.string().optional().describe('Teléfono móvil'),
      tradeName: z.string().optional().describe('Nombre comercial'),
      iban: z.string().optional().describe('IBAN de la cuenta bancaria'),
      address: z.string().optional().describe('Dirección de facturación (calle y número)'),
      city: z.string().optional().describe('Ciudad'),
      postalCode: z.string().optional().describe('Código postal'),
      province: z.string().optional().describe('Provincia'),
      country: z.string().optional().describe('País (ej: España)'),
      countryCode: z.string().optional().describe('Código ISO del país (ej: ES)'),
      tags: z.array(z.string()).optional().describe('Etiquetas del contacto'),
      extra: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Campos adicionales según la API de Holded (passthrough)'),
    },
    async ({
      name, code, email, type, isperson, phone, mobile, tradeName, iban,
      address, city, postalCode, province, country, countryCode, tags, extra,
    }) => {
      try {
        const body: Record<string, unknown> = { name };
        if (code !== undefined) body.code = code;
        if (email !== undefined) body.email = email;
        if (type !== undefined) body.type = type;
        if (isperson !== undefined) body.isperson = isperson;
        if (phone !== undefined) body.phone = phone;
        if (mobile !== undefined) body.mobile = mobile;
        if (tradeName !== undefined) body.tradeName = tradeName;
        if (iban !== undefined) body.iban = iban;
        if (address || city || postalCode || province || country || countryCode) {
          body.billAddress = {
            ...(address !== undefined && { address }),
            ...(city !== undefined && { city }),
            ...(postalCode !== undefined && { postalCode }),
            ...(province !== undefined && { province }),
            ...(country !== undefined && { country }),
            ...(countryCode !== undefined && { countryCode }),
          };
        }
        if (tags !== undefined) body.tags = tags;
        if (extra) Object.assign(body, extra);
        const result = await client.createContact(body);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
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
