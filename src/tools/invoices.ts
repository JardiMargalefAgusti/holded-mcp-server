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

export function registerInvoiceTools(server: McpServer, client: HoldedClient): void {
  server.tool(
    'holded_list_invoices',
    'Lista las facturas de venta. Permite filtrar por fechas (timestamps Unix) y por contacto.',
    {
      starttmp: z.number().optional().describe('Fecha inicio en Unix timestamp (segundos)'),
      endtmp: z.number().optional().describe('Fecha fin en Unix timestamp (segundos)'),
      contactId: z.string().optional().describe('ID del contacto para filtrar'),
    },
    async ({ starttmp, endtmp, contactId }) => {
      try {
        const result = await client.listDocuments('invoice', {
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
    'holded_get_invoice',
    'Obtiene los detalles completos de una factura de venta por su ID.',
    {
      documentId: z.string().describe('ID de la factura'),
    },
    async ({ documentId }) => {
      try {
        const result = await client.getDocument('invoice', documentId);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_create_invoice',
    'Crea una nueva factura de venta. Requiere un contacto y al menos un item.',
    {
      contactId: z.string().describe('ID del contacto (cliente)'),
      items: z.array(itemSchema).min(1).describe('Líneas de la factura'),
      date: z.number().optional().describe('Fecha de la factura en Unix timestamp'),
      dueDate: z.number().optional().describe('Fecha de vencimiento en Unix timestamp'),
      notes: z.string().optional().describe('Observaciones de la factura'),
      currency: z.string().optional().describe('Código de moneda (ej: EUR, USD)'),
      numSerieId: z.string().optional().describe('ID de la serie de numeración'),
    },
    async ({ contactId, items, date, dueDate, notes, currency, numSerieId }) => {
      try {
        const body: Record<string, unknown> = { contactId, items };
        if (date !== undefined) body.date = date;
        if (dueDate !== undefined) body.dueDate = dueDate;
        if (notes !== undefined) body.notes = notes;
        if (currency !== undefined) body.currency = currency;
        if (numSerieId !== undefined) body.numSerieId = numSerieId;

        const result = await client.createDocument('invoice', body);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_update_invoice',
    'Actualiza una factura de venta existente.',
    {
      documentId: z.string().describe('ID de la factura a actualizar'),
      contactId: z.string().optional().describe('Nuevo ID del contacto'),
      items: z.array(itemSchema).optional().describe('Nuevas líneas de la factura'),
      date: z.number().optional().describe('Nueva fecha en Unix timestamp'),
      dueDate: z.number().optional().describe('Nueva fecha de vencimiento en Unix timestamp'),
      notes: z.string().optional().describe('Nuevas observaciones'),
      currency: z.string().optional().describe('Nuevo código de moneda'),
      numSerieId: z.string().optional().describe('Nuevo ID de serie de numeración'),
    },
    async ({ documentId, ...fields }) => {
      try {
        const body: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(fields)) {
          if (value !== undefined) body[key] = value;
        }
        const result = await client.updateDocument('invoice', documentId, body);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_delete_invoice',
    'Elimina una factura de venta por su ID.',
    {
      documentId: z.string().describe('ID de la factura a eliminar'),
    },
    async ({ documentId }) => {
      try {
        const result = await client.deleteDocument('invoice', documentId);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_pay_invoice',
    'Registra un pago para una factura de venta.',
    {
      documentId: z.string().describe('ID de la factura'),
      amount: z.number().describe('Importe del pago'),
      date: z.number().optional().describe('Fecha del pago en Unix timestamp'),
      treasuryId: z.string().optional().describe('ID de la cuenta bancaria en Holded'),
    },
    async ({ documentId, amount, date, treasuryId }) => {
      try {
        const body: Record<string, unknown> = { amount };
        if (date !== undefined) body.date = date;
        if (treasuryId !== undefined) body.treasuryId = treasuryId;

        const result = await client.payDocument('invoice', documentId, body);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_send_invoice',
    'Envía una factura de venta por email.',
    {
      documentId: z.string().describe('ID de la factura'),
      emails: z.array(z.string()).min(1).describe('Lista de direcciones de email'),
    },
    async ({ documentId, emails }) => {
      try {
        const result = await client.sendDocument('invoice', documentId, { emails });
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_get_invoice_pdf',
    'Obtiene el PDF de una factura de venta (devuelve datos en base64).',
    {
      documentId: z.string().describe('ID de la factura'),
    },
    async ({ documentId }) => {
      try {
        const result = await client.getDocumentPdf('invoice', documentId);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
