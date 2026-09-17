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
  transparent?: boolean;
  pureQrOnly?: boolean;
  darkColor?: string;
}

/**
 * Helper to draw a rounded rectangle on a canvas 2D context.
 */
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y + w, x, y, radius);
  ctx.closePath();
}

/**
 * Renders standard crisp QR Code with 100% transparent background:
 * - Standard square modules and standard finder patterns (standard format, scans instantly on any device).
 * - 100% transparent background (no white box behind it, alpha = 0).
 * - Purely the QR Code (no plaque number, no text, no frame).
 */
export async function renderStandardTransparentQR(
  canvas: HTMLCanvasElement,
  url: string,
  options: {
    width?: number;
    darkColor?: string;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  } = {}
): Promise<void> {
  const {
    width = 1200,
    darkColor = '#000000',
    margin = 1,
    errorCorrectionLevel = 'M',
  } = options;

  const qr = QRCode.create(url, { errorCorrectionLevel });
  const matrixSize = qr.modules.size;
  const totalGrid = matrixSize + margin * 2;
  const cellSize = width / totalGrid;

  canvas.width = width;
  canvas.height = width;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Completely transparent background (Alpha = 0)
  ctx.clearRect(0, 0, width, width);
  ctx.fillStyle = darkColor;

  // Standard crisp, square modules - standard universal QR Code format
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (qr.modules.get(r, c)) {
        const x = Math.round((c + margin) * cellSize);
        const y = Math.round((r + margin) * cellSize);
        const nextX = Math.round((c + margin + 1) * cellSize);
        const nextY = Math.round((r + margin + 1) * cellSize);
        ctx.fillRect(x, y, nextX - x, nextY - y);
      }
    }
  }
}

// Alias for backwards compatibility
export const renderBeautifulTransparentQR = renderStandardTransparentQR;

/**
 * Generates a pure transparent PNG DataURL of the QR Code (no background, no text).
 */
export async function generateTransparentQrDataUrl(
  url: string,
  options: { width?: number; darkColor?: string } = {}
): Promise<string> {
  const canvas = document.createElement('canvas');
  await renderStandardTransparentQR(canvas, url, options);
  return canvas.toDataURL('image/png');
}

/**
 * Copies the transparent QR Code PNG directly to the user's clipboard
 * so they can directly press Ctrl+V / Paste into CorelDraw, Illustrator, Canva, Photoshop, etc.
 */
export async function copyQrCodeImageToClipboard(
  canvas: HTMLCanvasElement
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard || typeof ClipboardItem === 'undefined') {
    return false;
  }
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        resolve(true);
      } catch (err) {
        console.warn('Clipboard image write failed:', err);
        resolve(false);
      }
    }, 'image/png');
  });
}

/**
 * Renders the clean QR Code PNG for plaque production:
 * - 100% TRANSPARENT BACKGROUND (no white box behind it).
 * - Standard, sharp QR Code modules (100% reliable scanning).
 * - PURE QR CODE ONLY: zero text, zero plaque number, ready to copy & paste into plaque artwork.
 */
export async function generatePlaquePngDataUrl(
  code: string,
  url: string,
  options: PlaqueRenderOptions | number = {}
): Promise<string> {
  const opts: PlaqueRenderOptions = typeof options === 'number' ? { width: options } : options;
  const width = opts.width || 1200;
  const darkColor = opts.darkColor || '#000000';

  // Always return pure transparent QR code without any plaque number or extra borders
  return await generateTransparentQrDataUrl(url, { width, darkColor });
}

/**
 * Downloads a single plaque PNG file to the user's browser.
 * Filename example: PLACA-0001_PAPAN-0001.png
 * Default: 100% transparent background (no white box).
 */
export async function downloadSingleQrPng(
  code: string,
  url: string,
  filename?: string,
  options?: PlaqueRenderOptions
): Promise<void> {
  const defaultFilename = `${getPlaqueExportFilename(code)}.png`;
  const dataUrl = await generatePlaquePngDataUrl(code, url, { width: 1500, ...options });
  const link = document.createElement('a');
  link.download = filename || defaultFilename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates a ZIP file containing PNGs of the selected QR Codes.
 * All PNGs generated with transparent background and beautiful modern design!
 * Filenames follow the production standard:
 * PLACA-0001_PAPAN-0001.png
 * PLACA-0002_PAPAN-0002.png
 * ...
 */
export async function generateQrZip(
  codes: QRCodeItem[],
  baseDomain: string,
  useCurrentOrigin: boolean,
  onProgress?: (current: number, total: number) => void,
  options?: PlaqueRenderOptions
): Promise<Blob> {
  const zip = new JSZip();
  const total = codes.length;

  for (let i = 0; i < total; i++) {
    const item = codes[i];
    const url = buildDynamicUrl(item.code, baseDomain, useCurrentOrigin);
    const dataUrl = await generatePlaquePngDataUrl(item.code, url, { width: 1200, ...options });
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

