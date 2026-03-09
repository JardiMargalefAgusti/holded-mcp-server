import type { HoldedDocType } from './types/holded.js';

export class HoldedClient {
  private readonly baseUrl = 'https://api.holded.com/api/invoicing/v1';
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
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, query } = options;

    const url = new URL(`${this.baseUrl}${path}`);
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

  // --- Productos ---

  async listProducts(): Promise<unknown[]> {
    return this.request<unknown[]>('/products');
  }

  async getProduct(productId: string): Promise<unknown> {
    return this.request<unknown>(`/products/${productId}`);
  }
}
