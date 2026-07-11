import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';

/**
 * Capture the letter element as a canvas
 */
async function captureLetter(element: HTMLElement): Promise<HTMLCanvasElement> {
  // Temporarily remove max-height and overflow to capture full content
  const scrollContainer = element.querySelector('.letter-scroll') as HTMLElement;
  const originalMaxHeight = scrollContainer?.style.maxHeight;
  const originalOverflow = scrollContainer?.style.overflow;

  if (scrollContainer) {
    scrollContainer.style.maxHeight = 'none';
    scrollContainer.style.overflow = 'visible';
  }

  const canvas = await html2canvas(element, {
    backgroundColor: '#faf6f0',
    scale: 2,
    useCORS: true,
    logging: false,
  });

  // Restore original styles
  if (scrollContainer) {
    scrollContainer.style.maxHeight = originalMaxHeight;
    scrollContainer.style.overflow = originalOverflow;
  }

  return canvas;
}

/**
 * Download letter as PNG image
 */
export async function downloadAsImage(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await captureLetter(element);
  canvas.toBlob((blob) => {
    if (blob) {
      saveAs(blob, `${filename}.png`);
    }
  }, 'image/png');
}

/**
 * Download letter as PDF
 */
export async function downloadAsPDF(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await captureLetter(element);
  const imgData = canvas.toDataURL('image/png');

  const pdfWidth = 210; // A4 width in mm
  const pdfHeight = 297; // A4 height in mm
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

  const width = imgWidth * ratio;
  const height = imgHeight * ratio;
  const x = (pdfWidth - width) / 2;
  const y = (pdfHeight - height) / 2;

  const pdf = new jsPDF('p', 'mm', 'a4');
  pdf.addImage(imgData, 'PNG', x, y, width, height);
  pdf.save(`${filename}.pdf`);
}

/**
 * Download letter as Word document (.doc)
 */
export function downloadAsWord(letterText: string, recipient: string, sender: string, filename: string): void {
  const htmlContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Noto Serif SC', '宋体', SimSun, serif;
          font-size: 14pt;
          line-height: 2;
          color: #3d2b1f;
          padding: 60px 80px;
        }
        .letter-content {
          white-space: pre-wrap;
        }
      </style>
    </head>
    <body>
      <div class="letter-content">${letterText.replace(/\n/g, '<br>')}</div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword;charset=utf-8',
  });
  saveAs(blob, `${filename}.doc`);
}
