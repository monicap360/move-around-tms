// AI Ticket Entry Engine
// Automates ticket entry using OCR and AI

import type {
  TicketData,
  OCRResult,
  TicketExtractionResult,
} from './types';

/**
 * AI Ticket Entry Engine
 * Automatically extracts and processes tickets from images/documents
 */
export class AITicketEntryEngine {
  /**
   * Process ticket image/document
   */
  async processTicket(
    imageData: File | Blob | ArrayBuffer,
    options?: {
      ocrProvider?: 'tesseract' | 'google_vision' | 'aws_textract' | 'azure_vision';
      useAI?: boolean;
    },
  ): Promise<TicketExtractionResult> {
    // Step 1: OCR extraction
    const ocrResult = await this.performOCR(imageData, options?.ocrProvider);

    // Step 2: AI parsing
    const ticketData = await this.parseTicketData(ocrResult.text, ocrResult.fields);

    // Step 3: Validation
    const validation = this.validateTicketData(ticketData);

    return {
      ticketData,
      confidence: ocrResult.confidence * validation.confidence,
      source: options?.useAI ? 'ai_parsing' : 'ocr',
      errors: validation.errors,
      warnings: validation.warnings,
    };
  }

  /**
   * Perform OCR on image
   */
  private async performOCR(
    imageData: File | Blob | ArrayBuffer,
    provider: 'tesseract' | 'google_vision' | 'aws_textract' | 'azure_vision' = 'tesseract',
  ): Promise<OCRResult> {
    // In production, use actual OCR service
    // For browser: Tesseract.js
    // For server: Google Vision API, AWS Textract, Azure Computer Vision

    // Placeholder implementation
    return {
      text: '',
      confidence: 0,
      fields: {},
    };
  }

  /**
   * Parse ticket data from OCR text using AI
   */
  private async parseTicketData(
    ocrText: string,
    ocrFields: Record<string, any>,
  ): Promise<TicketData> {
    // Use AI/NLP to extract structured data from unstructured text
    // Can use GPT-4, Claude, or custom models

    const ticketData: TicketData = {};

    // Extract ticket number
    const ticketNumberMatch = ocrText.match(/(?:ticket|receipt|invoice)\s*[#:]?\s*([A-Z0-9-]+)/i);
    if (ticketNumberMatch) {
      ticketData.ticketNumber = ticketNumberMatch[1];
    }

    // Extract date
    const dateMatch = ocrText.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/);
    if (dateMatch) {
      ticketData.date = new Date(dateMatch[1]);
    }

    // Extract total amount
    const totalMatch = ocrText.match(/(?:total|amount|due)[:\s]*\$?(\d+\.?\d*)/i);
    if (totalMatch) {
      ticketData.total = parseFloat(totalMatch[1]);
    }

    // Extract description (first few lines or common phrases)
    const lines = ocrText.split('\n').filter((line) => line.trim().length > 0);
    if (lines.length > 0) {
      ticketData.description = lines.slice(0, 3).join(' ');
    }

    // Extract location (look for address patterns)
    const locationMatch = ocrText.match(/(\d+\s+[\w\s]+(?:street|st|avenue|ave|road|rd|boulevard|blvd)[\w\s,]+)/i);
    if (locationMatch) {
      ticketData.location = locationMatch[1];
    }

    return ticketData;
  }

  /**
   * Validate extracted ticket data
   */
  private validateTicketData(ticketData: TicketData): {
    confidence: number;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    let confidence = 1.0;

    // Validate required fields
    if (!ticketData.amount && !ticketData.total) {
      errors.push('Missing amount');
      confidence *= 0.5;
    }

    if (!ticketData.date) {
      warnings.push('Date not found, using current date');
      ticketData.date = new Date();
      confidence *= 0.9;
    }

    if (!ticketData.description) {
      warnings.push('Description not found');
      confidence *= 0.8;
    }

    // Validate amount format
    if (ticketData.total && ticketData.total <= 0) {
      errors.push('Invalid total amount');
      confidence *= 0.3;
    }

    // Validate date is reasonable
    if (ticketData.date) {
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const oneMonthFuture = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      
      if (ticketData.date < oneYearAgo || ticketData.date > oneMonthFuture) {
        warnings.push('Date seems unusual');
        confidence *= 0.7;
      }
    }

    return {
      confidence: Math.max(0, Math.min(1, confidence)),
      errors,
      warnings,
    };
  }

  /**
   * Enhance ticket data with AI
   */
  async enhanceTicketData(ticketData: TicketData): Promise<TicketData> {
    // Use AI to fill in missing fields, categorize, suggest descriptions, etc.
    // This could use GPT-4 or similar models

    // Auto-categorize based on description
    if (ticketData.description && !ticketData.category) {
      const category = this.autoCategorize(ticketData.description);
      ticketData.category = category;
    }

    // Suggest driver if not provided
    if (!ticketData.driverId && ticketData.driverName) {
      // Could match driver name to driver ID
    }

    return ticketData;
  }

  /**
   * Auto-categorize ticket based on description
   */
  private autoCategorize(description: string): string {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('fuel') || lowerDesc.includes('gas')) return 'fuel';
    if (lowerDesc.includes('hotel') || lowerDesc.includes('lodging')) return 'lodging';
    if (lowerDesc.includes('meal') || lowerDesc.includes('restaurant') || lowerDesc.includes('food')) return 'meal';
    if (lowerDesc.includes('toll')) return 'toll';
    if (lowerDesc.includes('parking')) return 'parking';
    if (lowerDesc.includes('repair') || lowerDesc.includes('maintenance')) return 'maintenance';
    if (lowerDesc.includes('scale')) return 'scale';
    
    return 'other';
  }

  /**
   * Batch process multiple ticket images
   */
  async batchProcessTickets(
    images: (File | Blob | ArrayBuffer)[],
  ): Promise<TicketExtractionResult[]> {
    const results: TicketExtractionResult[] = [];
    
    for (const image of images) {
      try {
        const result = await this.processTicket(image, { useAI: true });
        results.push(result);
      } catch (error) {
        console.error('Error processing ticket image:', error);
        results.push({
          ticketData: {},
          confidence: 0,
          source: 'ocr',
          errors: ['Processing failed'],
        });
      }
    }
    
    return results;
  }
}

// Export singleton
export const aiTicketEntryEngine = new AITicketEntryEngine();
