// Tipos de documento soportados por la API de Holded
export type HoldedDocType = 'invoice' | 'purchase' | 'estimate';

// Línea de documento (item en facturas/presupuestos)
export interface HoldedDocumentItem {
  name: string;
  desc?: string;
  units: number;
  subtotal: number;
  tax: number;
  discount?: number;
  sku?: string;
  productId?: string;
}

// Documento (factura, compra, presupuesto)
export interface HoldedDocument {
  id: string;
  contact: string;
  contactName: string;
  desc: string;
  date: number;
  dueDate: number;
  notes: string;
  products: HoldedDocumentItem[];
  tax: number;
  subtotal: number;
  discount: number;
  total: number;
  docNumber: string;
  currency: string;
  status: number;
  paymentsTotal: number;
  paymentsPending: number;
  language?: string;
  customFields?: Array<{ field: string; value: string }>;
}

// Respuesta de creación de documento
export interface HoldedCreateResponse {
  status: number;
  id: string;
  invoiceNum?: string;
  contactId?: string;
}

// Respuesta genérica de acción
export interface HoldedActionResponse {
  status: number;
  info?: string;
  id?: string;
}

// Respuesta de pago
export interface HoldedPaymentResponse {
  status: number;
  invoiceId: string;
  invoiceNum: string;
  paymentId: string;
}

// Respuesta de PDF
export interface HoldedPdfResponse {
  status: number;
  data: string; // base64
}

// Contacto
export interface HoldedContact {
  id: string;
  customId?: string;
  name: string;
  code?: string;
  tradeName?: string;
  email?: string;
  mobile?: string;
  phone?: string;
  type: string;
  iban?: string;
  swift?: string;
  billAddress?: {
    address: string;
    city: string;
    postalCode: string;
    province: string;
    country: string;
    countryCode: string;
  };
  tags?: string[];
  notes?: Array<{ noteId: string; name: string; description: string }>;
  contactPersons?: Array<{ personId: string; name: string; email?: string }>;
}

// Producto/Servicio
export interface HoldedProduct {
  id: string;
  kind: string;
  name: string;
  desc?: string;
  price: number;
  tax: number;
  total: number;
  cost: number;
  stock?: number;
  sku?: string;
  barcode?: string;
  tags?: string[];
  categoryId?: string;
}
