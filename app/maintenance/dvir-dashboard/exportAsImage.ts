// Utility to export a DOM node as PNG using html2canvas
// Usage: import { exportNodeAsPng } from './exportAsImage';
//        exportNodeAsPng(document.getElementById('calendar-root'), 'calendar.png');
import html2canvas from "html2canvas";

export async function exportNodeAsPng(node: HTMLElement, filename: string) {
  if (!node) return;
  const canvas = await html2canvas(node);
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}
