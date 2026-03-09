import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HoldedClient } from '../holded-client.js';

const itemSchema = z.object({
  name: z.string().describe('Nombre del producto/servicio'),
  units: z.number().optional().default(1).describe('Cantidad'),
  subtotal: z.number().describe('Precio unitario sin impuestos'),
  tax: z.number().optional().default(21).describe('Porcentaje de impuesto (ej: 21)'),
  discount: z.number().optional().describe('Porcentaje de descuento'),
});

function errorResult(error: unknown) {
  return {
    content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
    isError: true as const,
  };
}

function textResult(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

export function registerEstimateTools(server: McpServer, client: HoldedClient): void {
  server.tool(
    'holded_list_estimates',
    'Lista los presupuestos. Permite filtrar por fechas y por contacto.',
    {
      starttmp: z.number().optional().describe('Fecha inicio en Unix timestamp (segundos)'),
      endtmp: z.number().optional().describe('Fecha fin en Unix timestamp (segundos)'),
      contactId: z.string().optional().describe('ID del contacto para filtrar'),
    },
    async ({ starttmp, endtmp, contactId }) => {
      try {
        const result = await client.listDocuments('estimate', {
          starttmp: starttmp?.toString(),
          endtmp: endtmp?.toString(),
          contactId,
        });
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_get_estimate',
    'Obtiene los detalles de un presupuesto por su ID.',
    {
      documentId: z.string().describe('ID del presupuesto'),
    },
    async ({ documentId }) => {
      try {
        const result = await client.getDocument('estimate', documentId);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_create_estimate',
    'Crea un nuevo presupuesto. Requiere un contacto y al menos un item.',
    {
      contactId: z.string().describe('ID del contacto (cliente)'),
      items: z.array(itemSchema).min(1).describe('Líneas del presupuesto'),
      date: z.number().optional().describe('Fecha del presupuesto en Unix timestamp'),
      dueDate: z.number().optional().describe('Fecha de validez en Unix timestamp'),
      notes: z.string().optional().describe('Observaciones del presupuesto'),
      desc: z.string().optional().describe('Descripción general del presupuesto'),
    },
    async ({ contactId, items, date, dueDate, notes, desc }) => {
      try {
        const body: Record<string, unknown> = { contactId, items };
        if (date !== undefined) body.date = date;
        if (dueDate !== undefined) body.dueDate = dueDate;
        if (notes !== undefined) body.notes = notes;
        if (desc !== undefined) body.desc = desc;

        const result = await client.createDocument('estimate', body);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_update_estimate',
    'Actualiza un presupuesto existente.',
    {
      documentId: z.string().describe('ID del presupuesto a actualizar'),
      contactId: z.string().optional().describe('Nuevo ID del contacto'),
      items: z.array(itemSchema).optional().describe('Nuevas líneas del presupuesto'),
      date: z.number().optional().describe('Nueva fecha en Unix timestamp'),
      dueDate: z.number().optional().describe('Nueva fecha de validez en Unix timestamp'),
      notes: z.string().optional().describe('Nuevas observaciones'),
      desc: z.string().optional().describe('Nueva descripción'),
    },
    async ({ documentId, ...fields }) => {
      try {
        const body: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(fields)) {
          if (value !== undefined) body[key] = value;
        }
        const result = await client.updateDocument('estimate', documentId, body);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_delete_estimate',
    'Elimina un presupuesto por su ID.',
    {
      documentId: z.string().describe('ID del presupuesto a eliminar'),
    },
    async ({ documentId }) => {
      try {
        const result = await client.deleteDocument('estimate', documentId);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_send_estimate',
    'Envía un presupuesto por email.',
    {
      documentId: z.string().describe('ID del presupuesto'),
      emails: z.array(z.string()).min(1).describe('Lista de direcciones de email'),
    },
    async ({ documentId, emails }) => {
      try {
        const result = await client.sendDocument('estimate', documentId, { emails });
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
