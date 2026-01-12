# Digital Provenance & Watermarking System

## Overview

The Digital Provenance & Watermarking System provides document integrity, ownership attribution, and tamper detection for your TMS. It adds watermarks to documents and embeds cryptographic metadata to track document history and verify authenticity.

## Features

- **Digital Watermarks**: Add visible watermarks to PDFs with customizable text, position, and opacity
- **Cryptographic Hashing**: SHA-256 hashing for document integrity verification
- **Metadata Embedding**: Embed provenance data directly in PDF metadata
- **Audit Trail**: Track document access and modifications
- **Tamper Detection**: Verify document integrity by comparing hashes

## Usage

### 1. Adding Watermarks to Documents

#### Server-Side (Recommended for PDFs)

```typescript
import { WatermarkUploader } from '@/components/documents/WatermarkUploader';

<WatermarkUploader
  organizationId="your-org-id"
  userId="user-id"
  onComplete={(result) => {
    console.log('Document ID:', result.documentId);
    console.log('URL:', result.url);
  }}
/>
```

#### API Endpoint

```bash
POST /api/documents/watermark
Content-Type: multipart/form-data

Fields:
- file: PDF file
- organizationId: Organization identifier
- userId: User identifier
- watermarkText: Optional watermark text (default: "CONFIDENTIAL")
- watermarkPosition: Optional position (center, diagonal, tiled, bottom-right)
- purpose: Optional purpose description
```

### 2. Verifying Document Integrity

```typescript
import { DocumentVerifier } from '@/components/documents/DocumentVerifier';

<DocumentVerifier />
```

Or via API:

```bash
GET /api/documents/watermark/verify?documentId=<id>&hash=<sha256-hash>
```

### 3. Programmatic Usage

```typescript
import {
  addWatermarkToPDF,
  createProvenanceMetadata,
  embedProvenanceInPDF,
  verifyDocumentIntegrity,
} from '@/lib/digitalProvenance';

// Add watermark
const watermarkedBuffer = await addWatermarkToPDF(pdfBuffer, {
  text: 'CONFIDENTIAL',
  position: 'diagonal',
  opacity: 0.2,
});

// Create metadata
const metadata = createProvenanceMetadata(
  documentId,
  organizationId,
  userId,
  filename,
  pdfBuffer
);

// Embed in PDF
const finalBuffer = await embedProvenanceInPDF(watermarkedBuffer, metadata);

// Verify integrity
const isValid = verifyDocumentIntegrity(finalBuffer, expectedHash);
```

## Watermark Positions

- **diagonal**: Diagonal watermark across the page (default)
- **center**: Centered watermark
- **tiled**: Repeating tile pattern
- **bottom-right**: Bottom-right corner with timestamp

## Database Schema

The system creates two tables:

1. **document_provenance**: Stores document metadata, hash, and provenance information
2. **document_access_log**: Tracks access and modifications for audit trail

Run the migration:

```bash
# Apply migration
psql -d your_database -f db/migrations/040_document_provenance.sql
```

## Security Considerations

1. **Row Level Security**: All tables have RLS policies to ensure users can only access their organization's documents
2. **Cryptographic Hashing**: SHA-256 ensures document integrity
3. **Metadata Embedding**: Provenance data is embedded in PDF metadata for offline verification
4. **Access Logging**: All document access is logged for audit purposes

## Integration Points

### Document Upload Flow

```typescript
// After uploading a document
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('organizationId', orgId);
formData.append('userId', userId);

const response = await fetch('/api/documents/watermark', {
  method: 'POST',
  body: formData,
});

const { documentId, url, metadata } = await response.json();
// Store documentId and metadata.hash for future verification
```

### Compliance Tab Integration

Add watermarking to compliance documents:

```typescript
// In ComplianceTab.tsx
import { WatermarkUploader } from '@/components/documents/WatermarkUploader';

// After document upload
<WatermarkUploader
  organizationId={organizationId}
  userId={userId}
  onComplete={(result) => {
    // Update document record with watermarked URL
    updateDocumentUrl(docId, result.url, result.metadata.hash);
  }}
/>
```

## Best Practices

1. **Always verify documents** before critical operations (payroll, compliance, etc.)
2. **Store hash values** alongside document URLs for quick verification
3. **Use purpose field** to categorize documents (contracts, invoices, certificates)
4. **Review access logs** regularly for security audits
5. **Set appropriate watermark opacity** (0.2-0.3 recommended) to balance visibility and readability

## Troubleshooting

### Watermark not appearing
- Ensure PDF is not password-protected
- Check that file is valid PDF format
- Verify watermark options (text, opacity, position)

### Verification fails
- Ensure you're using the correct hash (stored in metadata)
- Check that document hasn't been modified
- Verify document ID is correct

### Access denied errors
- Check RLS policies for your organization
- Ensure user has proper permissions
- Verify organization_id matches

## Future Enhancements

- Image watermarking (JPG, PNG)
- QR code generation for quick verification
- Blockchain integration for immutable provenance
- Batch watermarking for multiple documents
- Custom watermark designs/images
- Email notifications on document access
