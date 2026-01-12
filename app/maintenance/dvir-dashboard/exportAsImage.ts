import html2canvas from "html2canvas";

/**
 * Export a DOM node as a PNG image
 * @param node - The DOM node to export
 * @param filename - The filename for the downloaded image
 */
export function exportNodeAsPng(node: HTMLElement, filename: string) {
  html2canvas(node, {
    backgroundColor: "#ffffff",
    scale: 2,
    logging: false,
  }).then((canvas) => {
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }).catch((error) => {
    console.error("Error exporting image:", error);
    alert("Failed to export image. Please try again.");
  });
}
