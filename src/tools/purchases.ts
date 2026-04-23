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

export function registerPurchaseTools(server: McpServer, client: HoldedClient): void {
  server.tool(
    'holded_list_purchases',
    'Lista las facturas de compra (gastos). Permite filtrar por fechas.',
    {
      starttmp: z.number().optional().describe('Fecha inicio en Unix timestamp (segundos)'),
      endtmp: z.number().optional().describe('Fecha fin en Unix timestamp (segundos)'),
    },
    async ({ starttmp, endtmp }) => {
      try {
        const result = await client.listDocuments('purchase', {
          starttmp: starttmp?.toString(),
          endtmp: endtmp?.toString(),
        });
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_get_purchase',
    'Obtiene los detalles de una factura de compra por su ID.',
    {
      documentId: z.string().describe('ID de la factura de compra'),
    },
    async ({ documentId }) => {
      try {
        const result = await client.getDocument('purchase', documentId);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_create_purchase',
    'Registra una nueva factura de compra (gasto). Requiere un contacto y al menos un item.',
    {
      contactId: z.string().describe('ID del contacto (proveedor)'),
      items: z.array(itemSchema).min(1).describe('Líneas de la factura'),
      invoiceNum: z.string().optional().describe('Número de factura del proveedor'),
      date: z.number().optional().describe('Fecha de la factura en Unix timestamp'),
      expenseAccountId: z.string().optional().describe('ID de la cuenta de gasto'),
    },
    async ({ contactId, items, invoiceNum, date, expenseAccountId }) => {
      try {
        const body: Record<string, unknown> = { contactId, items };
        if (invoiceNum !== undefined) body.invoiceNum = invoiceNum;
        if (date !== undefined) body.date = date;
        if (expenseAccountId !== undefined) body.expenseAccountId = expenseAccountId;

        const result = await client.createDocument('purchase', body);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_update_purchase',
    'Actualiza una factura de compra existente.',
    {
      documentId: z.string().describe('ID de la factura de compra a actualizar'),
      contactId: z.string().optional().describe('Nuevo ID del contacto'),
      items: z.array(itemSchema).optional().describe('Nuevas líneas de la factura'),
      invoiceNum: z.string().optional().describe('Nuevo número de factura del proveedor'),
      date: z.number().optional().describe('Nueva fecha en Unix timestamp'),
      expenseAccountId: z.string().optional().describe('Nuevo ID de cuenta de gasto'),
    },
    async ({ documentId, ...fields }) => {
      try {
        const body: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(fields)) {
          if (value !== undefined) body[key] = value;
        }
        const result = await client.updateDocument('purchase', documentId, body);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_delete_purchase',
    'Elimina una factura de compra por su ID.',
    {
      documentId: z.string().describe('ID de la factura de compra a eliminar'),
    },
    async ({ documentId }) => {
      try {
        const result = await client.deleteDocument('purchase', documentId);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_pay_purchase',
    'Registra un pago para una factura de compra (pago a proveedor).',
    {
      documentId: z.string().describe('ID de la factura de compra'),
      amount: z.number().describe('Importe del pago'),
      date: z.number().optional().describe('Fecha del pago en Unix timestamp'),
      treasuryId: z.string().optional().describe('ID de la cuenta bancaria en Holded'),
    },
    async ({ documentId, amount, date, treasuryId }) => {
      try {
        const body: Record<string, unknown> = { amount };
        if (date !== undefined) body.date = date;
        if (treasuryId !== undefined) body.treasuryId = treasuryId;

        const result = await client.payDocument('purchase', documentId, body);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_get_purchase_pdf',
    'Obtiene el PDF de una factura de compra (devuelve datos en base64). Para descargas por lote, el cliente debe invocar esta tool una vez por cada ID previamente obtenido con holded_list_purchases.',
    {
      documentId: z.string().describe('ID de la factura de compra'),
    },
    async ({ documentId }) => {
      try {
        const result = await client.getDocumentPdf('purchase', documentId);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
