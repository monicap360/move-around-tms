import React from 'react';
import dynamic from 'next/dynamic';

// Use a real QR code scanner for production
const QrReader = dynamic(() => import('react-qr-reader'), { ssr: false });

interface QRCodeScanProps {
  onScan: (data: string) => void;
}

const QRCodeScan: React.FC<QRCodeScanProps> = ({ onScan }) => {
  const handleScan = (data: string | null) => {
    if (data) onScan(data);
  };
  const handleError = (err: any) => {
    // Optionally show error
    console.error('QR Scan error', err);
  };
  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Scan QR/Barcode:</div>
      <QrReader
        delay={300}
        onError={handleError}
        onScan={handleScan}
        style={{ width: 240 }}
      />
    </div>
  );
};

export default QRCodeScan;
