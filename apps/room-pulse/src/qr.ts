import QRCode from 'qrcode';

export async function renderQRCodeToCanvas(
  canvas: HTMLCanvasElement,
  text: string,
  options?: {darkColor?: string; lightColor?: string; width?: number},
): Promise<void> {
  try {
    await QRCode.toCanvas(canvas, text, {
      width: options?.width ?? 180,
      margin: 2,
      color: {
        dark: options?.darkColor ?? '#ffffff',
        light: options?.lightColor ?? '#00000000',
      },
    });
  } catch (err) {
    console.error('Failed to render QR code:', err);
  }
}
