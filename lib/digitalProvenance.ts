/**
 * Digital Provenance & Watermarking System
 * 
 * Provides document integrity, ownership attribution, and tamper detection
 * through digital watermarks, metadata embedding, and cryptographic hashing.
 */

import crypto from 'crypto';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface ProvenanceMetadata {
  documentId: string;
  organizationId: string;
  userId: string;
  timestamp: string;
  hash: string;
  version: number;
  originalFilename: string;
  createdBy: string;
  purpose?: string;
  customMetadata?: Record<string, any>;
}

export interface WatermarkOptions {
  text?: string;
  opacity?: number;
  fontSize?: number;
  color?: { r: number; g: number; b: number };
  position?: 'center' | 'diagonal' | 'tiled' | 'bottom-right';
  includeMetadata?: boolean;
}

/**
 * Generate cryptographic hash of document content
 */
export function generateDocumentHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Create provenance metadata
 */
export function createProvenanceMetadata(
  documentId: string,
  organizationId: string,
  userId: string,
  originalFilename: string,
  documentBuffer: Buffer,
  options?: Partial<ProvenanceMetadata>
): ProvenanceMetadata {
  const hash = generateDocumentHash(documentBuffer);
  const timestamp = new Date().toISOString();

  return {
    documentId,
    organizationId,
    userId,
    timestamp,
    hash,
    version: 1,
    originalFilename,
    createdBy: userId,
    ...options,
  };
}

/**
 * Add watermark to PDF document
 */
export async function addWatermarkToPDF(
  pdfBuffer: Buffer,
  options: WatermarkOptions
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const {
    text = 'CONFIDENTIAL',
    opacity = 0.2,
    fontSize = 48,
    color = { r: 0, g: 0, b: 0 },
    position = 'diagonal',
  } = options;

  const watermarkColor = rgb(color.r, color.g, color.b);

  pages.forEach((page) => {
    const { width, height } = page.getSize();

    switch (position) {
      case 'center':
        page.drawText(text, {
          x: width / 2 - (text.length * fontSize) / 4,
          y: height / 2,
          size: fontSize,
          font,
          color: watermarkColor,
          opacity,
          rotate: { angleRadians: 0 },
        });
        break;

      case 'diagonal':
        // Diagonal watermark across the page
        page.drawText(text, {
          x: 50,
          y: height - 100,
          size: fontSize,
          font,
          color: watermarkColor,
          opacity,
          rotate: { angleRadians: -0.785 }, // -45 degrees
        });
        break;

      case 'tiled':
        // Tiled watermark pattern
        const tileSize = 200;
        for (let x = 0; x < width; x += tileSize) {
          for (let y = 0; y < height; y += tileSize) {
            page.drawText(text, {
              x: x + 50,
              y: y + 50,
              size: fontSize * 0.6,
              font,
              color: watermarkColor,
              opacity: opacity * 0.7,
              rotate: { angleRadians: -0.785 },
            });
          }
        }
        break;

      case 'bottom-right':
        // Bottom-right corner watermark
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        page.drawText(text, {
          x: width - textWidth - 20,
          y: 20,
          size: fontSize * 0.5,
          font,
          color: watermarkColor,
          opacity,
        });
        // Add timestamp below
        const timestamp = new Date().toLocaleString();
        const timestampWidth = font.widthOfTextAtSize(timestamp, fontSize * 0.3);
        page.drawText(timestamp, {
          x: width - timestampWidth - 20,
          y: 5,
          size: fontSize * 0.3,
          font,
          color: watermarkColor,
          opacity: opacity * 0.8,
        });
        break;
    }
  });

  return await pdfDoc.save();
}

/**
 * Embed provenance metadata into PDF document metadata
 */
export async function embedProvenanceInPDF(
  pdfBuffer: Buffer,
  metadata: ProvenanceMetadata
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);

  // Set PDF metadata (visible in document properties)
  pdfDoc.setTitle(`${metadata.originalFilename} - ${metadata.documentId}`);
  pdfDoc.setAuthor(metadata.organizationId);
  pdfDoc.setSubject(`Document ID: ${metadata.documentId} | Hash: ${metadata.hash}`);
  pdfDoc.setCreator('MoveAround TMS - Digital Provenance System');
  pdfDoc.setProducer('MoveAround TMS');
  pdfDoc.setCreationDate(new Date(metadata.timestamp));
  pdfDoc.setModificationDate(new Date(metadata.timestamp));

  // Embed custom metadata as JSON in keywords field (for easy extraction)
  const customData = {
    documentId: metadata.documentId,
    organizationId: metadata.organizationId,
    hash: metadata.hash,
    version: metadata.version,
    timestamp: metadata.timestamp,
    ...metadata.customMetadata,
  };
  pdfDoc.setKeywords(JSON.stringify(customData));

  return await pdfDoc.save();
}

/**
 * Add watermark to image (using Canvas API)
 * This function is designed for client-side use
 */
export async function addWatermarkToImage(
  imageFile: File,
  options: WatermarkOptions
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Add watermark
      const {
        text = 'CONFIDENTIAL',
        opacity = 0.3,
        fontSize = 48,
        position = 'diagonal',
      } = options;

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.font = `${fontSize}px Arial`;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      switch (position) {
        case 'center':
          ctx.fillText(text, canvas.width / 2, canvas.height / 2);
          break;

        case 'diagonal':
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate(-Math.PI / 4);
          ctx.fillText(text, 0, 0);
          break;

        case 'tiled':
          const tileSize = 200;
          for (let x = 0; x < canvas.width; x += tileSize) {
            for (let y = 0; y < canvas.height; y += tileSize) {
              ctx.fillText(text, x + tileSize / 2, y + tileSize / 2);
            }
          }
          break;

        case 'bottom-right':
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          ctx.fillText(text, canvas.width - 20, 30);
          ctx.font = `${fontSize * 0.5}px Arial`;
          ctx.fillText(new Date().toLocaleString(), canvas.width - 20, 10);
          break;
      }

      ctx.restore();

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, imageFile.type);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(imageFile);
  });
}

/**
 * Verify document integrity by comparing hash
 */
export function verifyDocumentIntegrity(
  documentBuffer: Buffer,
  expectedHash: string
): boolean {
  const currentHash = generateDocumentHash(documentBuffer);
  return currentHash === expectedHash;
}

/**
 * Extract provenance metadata from PDF
 */
export async function extractProvenanceFromPDF(
  pdfBuffer: Buffer
): Promise<Partial<ProvenanceMetadata> | null> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const keywords = pdfDoc.getKeywords();

    if (keywords) {
      try {
        return JSON.parse(keywords);
      } catch {
        // If keywords is not JSON, try to parse from subject
        const subject = pdfDoc.getSubject();
        if (subject) {
          // Extract hash from subject if present
          const hashMatch = subject.match(/Hash: ([a-f0-9]{64})/);
          const docIdMatch = subject.match(/Document ID: ([^\s\|]+)/);
          return {
            hash: hashMatch ? hashMatch[1] : undefined,
            documentId: docIdMatch ? docIdMatch[1] : undefined,
          };
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting provenance:', error);
    return null;
  }
}

/**
 * Create a comprehensive watermarked document with provenance
 */
export async function createProvenancedDocument(
  originalBuffer: Buffer,
  metadata: ProvenanceMetadata,
  watermarkOptions?: WatermarkOptions
): Promise<Buffer> {
  let processedBuffer = originalBuffer;

  // Add watermark if requested
  if (watermarkOptions) {
    processedBuffer = await addWatermarkToPDF(processedBuffer, watermarkOptions);
  }

  // Embed provenance metadata
  processedBuffer = await embedProvenanceInPDF(processedBuffer, metadata);

  return processedBuffer;
}
