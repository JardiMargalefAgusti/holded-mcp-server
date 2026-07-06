import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HoldedClient } from '../holded-client.js';

const extraSchema = z
  .record(z.string(), z.unknown())
  .optional()
  .describe('Campos adicionales según la API de Holded (passthrough)');

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

export function registerCrmTools(server: McpServer, client: HoldedClient): void {
  // --- Embudos (funnels) ---

  server.tool(
    'holded_list_funnels',
    'Lista los embudos (funnels) del CRM de Holded con sus etapas.',
    {},
    async () => {
      try {
        const result = await client.listFunnels();
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_get_funnel',
    'Obtiene los detalles de un embudo del CRM por su ID, incluyendo sus etapas.',
    {
      funnelId: z.string().describe('ID del embudo'),
    },
    async ({ funnelId }) => {
      try {
        const result = await client.getFunnel(funnelId);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_create_funnel',
    'Crea un nuevo embudo (funnel) en el CRM de Holded.',
    {
      name: z.string().describe('Nombre del embudo'),
      extra: extraSchema,
    },
    async ({ name, extra }) => {
      try {
        const body: Record<string, unknown> = { name };
        if (extra) Object.assign(body, extra);
        const result = await client.createFunnel(body);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_update_funnel',
    'Actualiza un embudo existente del CRM.',
    {
      funnelId: z.string().describe('ID del embudo a actualizar'),
      name: z.string().optional().describe('Nuevo nombre del embudo'),
      extra: extraSchema,
    },
    async ({ funnelId, name, extra }) => {
      try {
        const body: Record<string, unknown> = {};
        if (name !== undefined) body.name = name;
        if (extra) Object.assign(body, extra);
        const result = await client.updateFunnel(funnelId, body);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_delete_funnel',
    'Elimina un embudo del CRM por su ID.',
    {
      funnelId: z.string().describe('ID del embudo a eliminar'),
    },
    async ({ funnelId }) => {
      try {
        const result = await client.deleteFunnel(funnelId);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  // --- Leads ---

  server.tool(
    'holded_list_leads',
    'Lista los leads (oportunidades de venta) del CRM de Holded.',
    {},
    async () => {
      try {
        const result = await client.listLeads();
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_get_lead',
    'Obtiene los detalles completos de un lead del CRM por su ID (incluye notas y tareas).',
    {
      leadId: z.string().describe('ID del lead'),
    },
    async ({ leadId }) => {
      try {
        const result = await client.getLead(leadId);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_create_lead',
    'Crea un nuevo lead (oportunidad) en el CRM de Holded.',
    {
      name: z.string().describe('Nombre del lead / oportunidad'),
      contactId: z.string().optional().describe('ID del contacto asociado'),
      funnelId: z.string().optional().describe('ID del embudo donde crear el lead'),
      stageId: z.string().optional().describe('ID de la etapa del embudo'),
      value: z.number().optional().describe('Valor económico estimado de la oportunidad'),
      notes: z.string().optional().describe('Notas / descripción del lead'),
      extra: extraSchema,
    },
    async ({ name, contactId, funnelId, stageId, value, notes, extra }) => {
      try {
        const body: Record<string, unknown> = { name };
        if (contactId !== undefined) body.contactId = contactId;
        if (funnelId !== undefined) body.funnelId = funnelId;
        if (stageId !== undefined) body.stageId = stageId;
        if (value !== undefined) body.value = value;
        if (notes !== undefined) body.notes = notes;
        if (extra) Object.assign(body, extra);
        const result = await client.createLead(body);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_update_lead',
    'Actualiza un lead existente del CRM.',
    {
      leadId: z.string().describe('ID del lead a actualizar'),
      name: z.string().optional().describe('Nuevo nombre del lead'),
      contactId: z.string().optional().describe('Nuevo ID del contacto asociado'),
      funnelId: z.string().optional().describe('Nuevo ID del embudo'),
      stageId: z.string().optional().describe('Nueva etapa del embudo'),
      value: z.number().optional().describe('Nuevo valor económico estimado'),
      notes: z.string().optional().describe('Nuevas notas / descripción'),
      extra: extraSchema,
    },
    async ({ leadId, extra, ...fields }) => {
      try {
        const body: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(fields)) {
          if (value !== undefined) body[key] = value;
        }
        if (extra) Object.assign(body, extra);
        const result = await client.updateLead(leadId, body);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_delete_lead',
    'Elimina un lead del CRM por su ID.',
    {
      leadId: z.string().describe('ID del lead a eliminar'),
    },
    async ({ leadId }) => {
      try {
        const result = await client.deleteLead(leadId);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_update_lead_stage',
    'Mueve un lead a otra etapa del embudo del CRM.',
    {
      leadId: z.string().describe('ID del lead'),
      stageId: z.string().describe('ID de la etapa destino'),
    },
    async ({ leadId, stageId }) => {
      try {
        const result = await client.updateLeadStage(leadId, { stageId });
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_update_lead_dates',
    'Actualiza las fechas de un lead del CRM.',
    {
      leadId: z.string().describe('ID del lead'),
      startDate: z.number().optional().describe('Fecha de inicio en Unix timestamp (segundos)'),
      endDate: z.number().optional().describe('Fecha de cierre prevista en Unix timestamp (segundos)'),
      extra: extraSchema,
    },
    async ({ leadId, startDate, endDate, extra }) => {
      try {
        const body: Record<string, unknown> = {};
        if (startDate !== undefined) body.startDate = startDate;
        if (endDate !== undefined) body.endDate = endDate;
        if (extra) Object.assign(body, extra);
        const result = await client.updateLeadDates(leadId, body);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_create_lead_note',
    'Añade una nota a un lead del CRM.',
    {
      leadId: z.string().describe('ID del lead'),
      name: z.string().optional().describe('Título de la nota'),
      description: z.string().describe('Contenido de la nota'),
    },
    async ({ leadId, name, description }) => {
      try {
        const body: Record<string, unknown> = { description };
        if (name !== undefined) body.name = name;
        const result = await client.createLeadNote(leadId, body);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_update_lead_note',
    'Actualiza una nota existente de un lead del CRM.',
    {
      leadId: z.string().describe('ID del lead'),
      noteId: z.string().describe('ID de la nota a actualizar'),
      name: z.string().optional().describe('Nuevo título de la nota'),
      description: z.string().optional().describe('Nuevo contenido de la nota'),
    },
    async ({ leadId, noteId, name, description }) => {
      try {
        const body: Record<string, unknown> = { noteId };
        if (name !== undefined) body.name = name;
        if (description !== undefined) body.description = description;
        const result = await client.updateLeadNote(leadId, body);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_create_lead_task',
    'Crea una tarea asociada a un lead del CRM.',
    {
      leadId: z.string().describe('ID del lead'),
      name: z.string().describe('Título de la tarea'),
      description: z.string().optional().describe('Descripción de la tarea'),
      date: z.number().optional().describe('Fecha límite en Unix timestamp (segundos)'),
      extra: extraSchema,
    },
    async ({ leadId, name, description, date, extra }) => {
      try {
        const body: Record<string, unknown> = { name };
        if (description !== undefined) body.description = description;
        if (date !== undefined) body.date = date;
        if (extra) Object.assign(body, extra);
        const result = await client.createLeadTask(leadId, body);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_update_lead_task',
    'Actualiza una tarea existente de un lead del CRM.',
    {
      leadId: z.string().describe('ID del lead'),
      taskId: z.string().describe('ID de la tarea a actualizar'),
      name: z.string().optional().describe('Nuevo título de la tarea'),
      description: z.string().optional().describe('Nueva descripción'),
      date: z.number().optional().describe('Nueva fecha límite en Unix timestamp (segundos)'),
      extra: extraSchema,
    },
    async ({ leadId, taskId, name, description, date, extra }) => {
      try {
        const body: Record<string, unknown> = { taskId };
        if (name !== undefined) body.name = name;
        if (description !== undefined) body.description = description;
        if (date !== undefined) body.date = date;
        if (extra) Object.assign(body, extra);
        const result = await client.updateLeadTask(leadId, body);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_delete_lead_task',
    'Elimina una tarea de un lead del CRM.',
    {
      leadId: z.string().describe('ID del lead'),
      taskId: z.string().describe('ID de la tarea a eliminar'),
    },
    async ({ leadId, taskId }) => {
      try {
        const result = await client.deleteLeadTask(leadId, { taskId });
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
