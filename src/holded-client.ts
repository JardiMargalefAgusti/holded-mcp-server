import type { HoldedDocType } from './types/holded.js';

// APIs de Holded soportadas (cada una tiene su propio prefijo de ruta)
type HoldedApi = 'invoicing' | 'crm' | 'team';

export class HoldedClient {
  private static readonly API_ROOT = 'https://api.holded.com/api';
  private readonly apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('HOLDED_API_KEY is required');
    }
    this.apiKey = apiKey;
  }

  private async request<T>(
    path: string,
    options: {
      method?: string;
      body?: Record<string, unknown>;
      query?: Record<string, string | undefined>;
      api?: HoldedApi;
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, query, api = 'invoicing' } = options;

    const url = new URL(`${HoldedClient.API_ROOT}/${api}/v1${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, value);
        }
      }
    }

    const headers: Record<string, string> = {
      'key': this.apiKey,
      'Accept': 'application/json',
    };
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.status === 429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.error(`Rate limited (429). Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Holded API error ${response.status}: ${errorBody}`);
      }

      return (await response.json()) as T;
    }

    throw new Error('Max retries exceeded for rate-limited request');
  }

  // --- Documentos (invoice, purchase, estimate) ---

  async listDocuments(
    docType: HoldedDocType,
    filters?: { starttmp?: string; endtmp?: string; contactId?: string }
  ): Promise<unknown[]> {
    return this.request<unknown[]>(`/documents/${docType}`, {
      query: {
        starttmp: filters?.starttmp,
        endtmp: filters?.endtmp,
        contactId: filters?.contactId,
      },
    });
  }

  async getDocument(docType: HoldedDocType, documentId: string): Promise<unknown> {
    return this.request<unknown>(`/documents/${docType}/${documentId}`);
  }

  async createDocument(docType: HoldedDocType, body: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>(`/documents/${docType}`, { method: 'POST', body });
  }

  async updateDocument(
    docType: HoldedDocType,
    documentId: string,
    body: Record<string, unknown>
  ): Promise<unknown> {
    return this.request<unknown>(`/documents/${docType}/${documentId}`, {
      method: 'PUT',
      body,
    });
  }

  async deleteDocument(docType: HoldedDocType, documentId: string): Promise<unknown> {
    return this.request<unknown>(`/documents/${docType}/${documentId}`, {
      method: 'DELETE',
    });
  }

  async payDocument(
    docType: HoldedDocType,
    documentId: string,
    body: Record<string, unknown>
  ): Promise<unknown> {
    return this.request<unknown>(`/documents/${docType}/${documentId}/pay`, {
      method: 'POST',
      body,
    });
  }

  async sendDocument(
    docType: HoldedDocType,
    documentId: string,
    body: Record<string, unknown>
  ): Promise<unknown> {
    return this.request<unknown>(`/documents/${docType}/${documentId}/send`, {
      method: 'POST',
      body,
    });
  }

  async getDocumentPdf(docType: HoldedDocType, documentId: string): Promise<unknown> {
    return this.request<unknown>(`/documents/${docType}/${documentId}/pdf`);
  }

  // --- Contactos ---

  async listContacts(): Promise<unknown[]> {
    return this.request<unknown[]>('/contacts');
  }

  async getContact(contactId: string): Promise<unknown> {
    return this.request<unknown>(`/contacts/${contactId}`);
  }

  async createContact(body: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>('/contacts', { method: 'POST', body });
  }

  // --- Productos ---

  async listProducts(): Promise<unknown[]> {
    return this.request<unknown[]>('/products');
  }

  async getProduct(productId: string): Promise<unknown> {
    return this.request<unknown>(`/products/${productId}`);
  }

  // --- CRM: Embudos (funnels) ---

  async listFunnels(): Promise<unknown[]> {
    return this.request<unknown[]>('/funnels', { api: 'crm' });
  }

  async getFunnel(funnelId: string): Promise<unknown> {
    return this.request<unknown>(`/funnels/${funnelId}`, { api: 'crm' });
  }

  async createFunnel(body: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>('/funnels', { method: 'POST', body, api: 'crm' });
  }

  async updateFunnel(funnelId: string, body: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>(`/funnels/${funnelId}`, { method: 'PUT', body, api: 'crm' });
  }

  async deleteFunnel(funnelId: string): Promise<unknown> {
    return this.request<unknown>(`/funnels/${funnelId}`, { method: 'DELETE', api: 'crm' });
  }

  // --- CRM: Leads ---

  async listLeads(): Promise<unknown[]> {
    return this.request<unknown[]>('/leads', { api: 'crm' });
  }

  async getLead(leadId: string): Promise<unknown> {
    return this.request<unknown>(`/leads/${leadId}`, { api: 'crm' });
  }

  async createLead(body: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>('/leads', { method: 'POST', body, api: 'crm' });
  }

  async updateLead(leadId: string, body: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>(`/leads/${leadId}`, { method: 'PUT', body, api: 'crm' });
  }

  async deleteLead(leadId: string): Promise<unknown> {
    return this.request<unknown>(`/leads/${leadId}`, { method: 'DELETE', api: 'crm' });
  }

  async updateLeadStage(leadId: string, body: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>(`/leads/${leadId}/stage`, { method: 'PUT', body, api: 'crm' });
  }

  async updateLeadDates(leadId: string, body: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>(`/leads/${leadId}/dates`, { method: 'PUT', body, api: 'crm' });
  }

  async createLeadNote(leadId: string, body: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>(`/leads/${leadId}/notes`, { method: 'POST', body, api: 'crm' });
  }

  async updateLeadNote(leadId: string, body: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>(`/leads/${leadId}/notes`, { method: 'PUT', body, api: 'crm' });
  }

  async createLeadTask(leadId: string, body: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>(`/leads/${leadId}/tasks`, { method: 'POST', body, api: 'crm' });
  }

  async updateLeadTask(leadId: string, body: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>(`/leads/${leadId}/tasks`, { method: 'PUT', body, api: 'crm' });
  }

  async deleteLeadTask(leadId: string, body: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>(`/leads/${leadId}/tasks`, { method: 'DELETE', body, api: 'crm' });
  }

  // --- Equipo: empleados y control horario ---

  async listEmployees(): Promise<unknown> {
    return this.request<unknown>('/employees', { api: 'team' });
  }

  async getEmployee(employeeId: string): Promise<unknown> {
    return this.request<unknown>(`/employees/${employeeId}`, { api: 'team' });
  }

  async getEmployeeTimes(employeeId: string): Promise<unknown> {
    return this.request<unknown>(`/employees/${employeeId}/times`, { api: 'team' });
  }

  async createEmployeeTime(employeeId: string, body: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>(`/employees/${employeeId}/times`, { method: 'POST', body, api: 'team' });
  }

  async clockIn(employeeId: string, body: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>(`/employees/${employeeId}/times/clockin`, { method: 'POST', body, api: 'team' });
  }

  // Ojo: la ruta real es camelCase (clockOut), a diferencia de clockin.
  async clockOut(employeeId: string, body: Record<string, unknown>): Promise<unknown> {
    return this.request<unknown>(`/employees/${employeeId}/times/clockOut`, { method: 'POST', body, api: 'team' });
  }
}
