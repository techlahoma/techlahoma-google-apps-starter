import QRCode from 'qrcode';

export interface QRResult {
  dataUrl: string;
  joinUrl: string;
  isLocalhost: boolean;
  warning?: string;
}

export async function generateJoinQR(
  roomCode: string,
  lanIpOverride?: string,
): Promise<QRResult> {
  const host =
    typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const port =
    typeof window !== 'undefined' && window.location.port
      ? `:${window.location.port}`
      : '';
  const protocol =
    typeof window !== 'undefined' ? window.location.protocol : 'http:';

  const isLocalhost = host === 'localhost' || host === '127.0.0.1';
  const effectiveHost = lanIpOverride || (isLocalhost ? '127.0.0.1' : host);
  const joinUrl = `${protocol}//${effectiveHost}${port}/room/${roomCode}`;

  // High-contrast black-on-white QR code with proper quiet zone (margin: 4)
  const dataUrl = await QRCode.toDataURL(joinUrl, {
    width: 280,
    margin: 4,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });

  const result: QRResult = {
    dataUrl,
    joinUrl,
    isLocalhost,
  };

  if (isLocalhost && !lanIpOverride) {
    result.warning =
      '⚠️ Warning: Opened via localhost. Mobile devices on your LAN cannot connect to 127.0.0.1. Open this host page using your LAN IP address or deploy to Firebase Hosting.';
  }

  return result;
}
