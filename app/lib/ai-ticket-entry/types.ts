// AI Ticket Entry System Types

export interface TicketData {
  driverId?: string;
  driverName?: string;
  ticketNumber?: string;
  date?: Date;
  amount?: number;
  description?: string;
  category?: string;
  location?: string;
  items?: TicketItem[];
  total?: number;
  tax?: number;
  attachments?: string[];
}

export interface TicketItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
}

export interface OCRResult {
  text: string;
  confidence: number;
  fields: Record<string, { value: any; confidence: number; boundingBox?: any }>;
  rawData?: any;
}

export interface TicketExtractionResult {
  ticketData: TicketData;
  confidence: number;
  source: 'ocr' | 'ai_parsing' | 'manual';
  errors?: string[];
  warnings?: string[];
}
