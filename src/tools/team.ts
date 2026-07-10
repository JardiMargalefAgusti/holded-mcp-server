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

export function registerTeamTools(server: McpServer, client: HoldedClient): void {
  server.tool(
    'holded_list_employees',
    'Lista los empleados del equipo en Holded. Incluye datos personales sensibles (DNI, NSS, IBAN, contrato) ' +
      'y su política de ausencias (timeOffPolicyId) y supervisores de vacaciones (timeOffSupervisors). ' +
      'Nota: la API de Holded no expone las ausencias/vacaciones en sí, solo estas referencias.',
    {},
    async () => {
      try {
        const result = await client.listEmployees();
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_get_employee',
    'Obtiene la ficha completa de un empleado por su ID (datos personales, contrato vigente, equipos, política de ausencias).',
    {
      employeeId: z.string().describe('ID del empleado'),
    },
    async ({ employeeId }) => {
      try {
        const result = await client.getEmployee(employeeId);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_get_employee_times',
    'Lista los registros de control horario (fichajes) de un empleado.',
    {
      employeeId: z.string().describe('ID del empleado'),
    },
    async ({ employeeId }) => {
      try {
        const result = await client.getEmployeeTimes(employeeId);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_create_employee_time',
    'Crea un registro de control horario para un empleado. La API exige inicio y fin (startTmp/endTmp).',
    {
      employeeId: z.string().describe('ID del empleado'),
      start: z.number().describe('Inicio del tramo en Unix timestamp (segundos)'),
      end: z.number().describe('Fin del tramo en Unix timestamp (segundos)'),
      extra: extraSchema,
    },
    async ({ employeeId, start, end, extra }) => {
      try {
        const body: Record<string, unknown> = { startTmp: start, endTmp: end };
        if (extra) Object.assign(body, extra);
        const result = await client.createEmployeeTime(employeeId, body);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_clock_in',
    'Ficha la ENTRADA de un empleado (abre un registro de control horario ahora). Cierra el tramo con holded_clock_out.',
    {
      employeeId: z.string().describe('ID del empleado'),
      extra: extraSchema,
    },
    async ({ employeeId, extra }) => {
      try {
        const result = await client.clockIn(employeeId, extra ?? {});
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );

  server.tool(
    'holded_clock_out',
    'Ficha la SALIDA de un empleado (cierra su registro de control horario abierto). Si no hay entrada abierta, la API devuelve error.',
    {
      employeeId: z.string().describe('ID del empleado'),
      extra: extraSchema,
    },
    async ({ employeeId, extra }) => {
      try {
        const result = await client.clockOut(employeeId, extra ?? {});
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
