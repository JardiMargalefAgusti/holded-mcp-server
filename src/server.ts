import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { HoldedClient } from './holded-client.js';
import { registerContactTools } from './tools/contacts.js';
import { registerProductTools } from './tools/products.js';
import { registerInvoiceTools } from './tools/invoices.js';
import { registerPurchaseTools } from './tools/purchases.js';
import { registerEstimateTools } from './tools/estimates.js';
import { registerCrmTools } from './tools/crm.js';

export async function runServer(): Promise<void> {
  const apiKey = process.env.HOLDED_API_KEY;
  if (!apiKey) {
    console.error('Error: HOLDED_API_KEY environment variable is required');
    process.exit(1);
  }

  const client = new HoldedClient(apiKey);

  const server = new McpServer({
    name: 'holded-mcp-server',
    version: '1.1.2',
  });

  registerContactTools(server, client);
  registerProductTools(server, client);
  registerInvoiceTools(server, client);
  registerPurchaseTools(server, client);
  registerEstimateTools(server, client);
  registerCrmTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Holded MCP server running on stdio');
}
