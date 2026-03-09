import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HoldedClient } from '../holded-client.js';

export function registerProductTools(server: McpServer, client: HoldedClient): void {
  server.tool(
    'holded_list_products',
    'Lista todos los productos y servicios configurados en Holded.',
    {},
    async () => {
      try {
        const products = await client.listProducts();
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(products, null, 2) }],
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
    'holded_get_product',
    'Obtiene los detalles de un producto o servicio por su ID.',
    {
      productId: z.string().describe('ID del producto en Holded'),
    },
    async ({ productId }) => {
      try {
        const product = await client.getProduct(productId);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(product, null, 2) }],
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
