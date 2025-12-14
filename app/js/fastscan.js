// FastScan OCR logic for MoveAround TMS
// Uses Tesseract.js for browser-based OCR

import Tesseract from 'tesseract.js';

const scanFileInput = document.getElementById('scan_file');
const startScanBtn = document.getElementById('startScanBtn');
const ocrJsonDisplay = document.getElementById('ocrJsonDisplay');

let ocrResult = {};

startScanBtn.addEventListener('click', async () => {
  if (!scanFileInput.files || scanFileInput.files.length === 0) {
    ocrJsonDisplay.textContent = 'Please select an image file.';
    return;
  }
  const file = scanFileInput.files[0];
  ocrJsonDisplay.textContent = 'Scanning...';

  try {
    const { data } = await Tesseract.recognize(file, 'eng', {
      logger: m => {
        ocrJsonDisplay.textContent = `Progress: ${Math.round(m.progress * 100)}%`;
      }
    });
    ocrResult = {
      text: data.text,
      confidence: data.confidence,
      blocks: data.blocks
    };
    ocrJsonDisplay.textContent = JSON.stringify(ocrResult, null, 2);
  } catch (err) {
    ocrJsonDisplay.textContent = 'OCR failed: ' + err.message;
  }
});

// You can add logic here to parse ocrResult.text for key fields (date, quantity, etc.)
