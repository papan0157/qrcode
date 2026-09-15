import QRCode from 'qrcode';
import JSZip from 'jszip';
import { QRCodeItem } from '../types';

/**
 * Builds the canonical dynamic URL for a QR code.
 * Follows the requirement:
 * https://qr.papanmedia.com.br/q/PAPAN-0001
 * Or if useCurrentOriginForLinks is enabled or custom domain is specified.
 */
export function buildDynamicUrl(
  code: string,
  baseDomain: string = 'https://qr.papanmedia.com.br',
  useCurrentOrigin: boolean = false
): string {
  let origin = baseDomain.trim();
  if (useCurrentOrigin && typeof window !== 'undefined' && window.location.origin) {
    origin = window.location.origin;
  }
  // Remove trailing slash
  origin = origin.replace(/\/+$/, '');
  return `${origin}/q/${code.toUpperCase()}`;
}

/**
 * Computes the physical plaque number from the internal code.
 * Ensures the physical plaque number is EXACTLY equal to the QR code digits.
 * Example:
 * PAPAN-0001 -> '0001'
 * PAPAN-0002 -> '0002'
 * PAPAN-0050 -> '0050'
 */
export function getPhysicalPlaqueNumber(code: string): string {
  const digits = code.replace(/\D/g, '');
  if (!digits) return '0001';
  // Exact match to code number (default 4 digits format like 0001)
  return digits.length >= 4 ? digits : digits.padStart(4, '0');
}

/**
 * Standardized filename for physical production export:
 * PLACA-0001_PAPAN-0001
 * PLACA-0002_PAPAN-0002
 */
export function getPlaqueExportFilename(code: string): string {
  const plaqueNum = getPhysicalPlaqueNumber(code);
  return `PLACA-${plaqueNum}_${code.toUpperCase()}`;
}

export type PlaqueNumberPosition = 'bottom-center' | 'bottom-right' | 'bottom-left';

export interface PlaqueRenderOptions {
  width?: number;
  numberPosition?: PlaqueNumberPosition;
  showPhysicalNumber?: boolean;
}

/**
 * Renders the clean physical plaque PNG for production:
 * - QR Code perfectly centered in the designated area.
 * - ZERO text, phrases, or slogans near the QR Code (NO "PAPAN-0001", NO "Avalie nossa empresa").
 * - ONLY the physical plaque number (e.g. "001") discreetly placed at the bottom footer.
 */
export async function generatePlaquePngDataUrl(
  code: string,
  url: string,
  options: PlaqueRenderOptions | number = {}
): Promise<string> {
  const opts: PlaqueRenderOptions = typeof options === 'number' ? { width: options } : options;
  const width = opts.width || 1000;
  const numberPosition = opts.numberPosition || 'bottom-center';
  const showPhysicalNumber = opts.showPhysicalNumber !== false;

  // Plaque proportions for physical acrylic / metal plates
  const height = Math.round(width * 1.18);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Clean solid background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Generate clean QR code
  const qrSize = Math.round(width * 0.76);
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, url, {
    width: qrSize,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  });

  // Center QR code on the canvas with balanced vertical breathing room
  const qrX = Math.round((width - qrSize) / 2);
  const qrY = Math.round((height - qrSize) / 2) - Math.round(width * 0.025);
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  // Discreet physical plaque number at the bottom footer (e.g. "001")
  // Configurable position (defaults to bottom-center)
  if (showPhysicalNumber) {
    const physicalNumber = getPhysicalPlaqueNumber(code);
    const fontSize = Math.round(width * 0.028); // Subtle, small, discreet size
    ctx.fillStyle = '#64748B'; // Professional slate gray
    ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = 'middle';

    const textY = height - Math.round(width * 0.045);

    if (numberPosition === 'bottom-left') {
      ctx.textAlign = 'left';
      ctx.fillText(physicalNumber, Math.round(width * 0.08), textY);
    } else if (numberPosition === 'bottom-right') {
      ctx.textAlign = 'right';
      ctx.fillText(physicalNumber, width - Math.round(width * 0.08), textY);
    } else {
      // bottom-center
      ctx.textAlign = 'center';
      ctx.fillText(physicalNumber, width / 2, textY);
    }
  }

  return canvas.toDataURL('image/png');
}

/**
 * Downloads a single plaque PNG file to the user's browser.
 * Filename example: PLACA-001_PAPAN-0001.png
 */
export async function downloadSingleQrPng(
  code: string,
  url: string,
  filename?: string
): Promise<void> {
  const defaultFilename = `${getPlaqueExportFilename(code)}.png`;
  const dataUrl = await generatePlaquePngDataUrl(code, url, { width: 1200 });
  const link = document.createElement('a');
  link.download = filename || defaultFilename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates a ZIP file containing PNGs of the selected QR Codes.
 * Filenames follow the production standard:
 * PLACA-001_PAPAN-0001.png
 * PLACA-002_PAPAN-0002.png
 * ...
 */
export async function generateQrZip(
  codes: QRCodeItem[],
  baseDomain: string,
  useCurrentOrigin: boolean,
  onProgress?: (current: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  const total = codes.length;

  for (let i = 0; i < total; i++) {
    const item = codes[i];
    const url = buildDynamicUrl(item.code, baseDomain, useCurrentOrigin);
    const dataUrl = await generatePlaquePngDataUrl(item.code, url, { width: 1000 });
    // Convert base64 dataUrl to binary
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    const filename = `${getPlaqueExportFilename(item.code)}.png`;
    zip.file(filename, base64Data, { base64: true });

    if (onProgress) {
      onProgress(i + 1, total);
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}
