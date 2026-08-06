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
  const host = window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : '';
  const protocol = window.location.protocol;

  const isLocalhost = host === 'localhost' || host === '127.0.0.1';

  const effectiveHost = lanIpOverride || (isLocalhost ? '127.0.0.1' : host);
  const joinUrl = `${protocol}//${effectiveHost}${port}/room/${roomCode}`;

  const dataUrl = await QRCode.toDataURL(joinUrl, {
    width: 280,
    margin: 2,
    color: {
      dark: '#00f5d4',
      light: '#0d1b2a',
    },
  });

  const result: QRResult = {
    dataUrl,
    joinUrl,
    isLocalhost,
  };

  if (isLocalhost && !lanIpOverride) {
    result.warning =
      '⚠️ Warning: Opened via localhost. Mobile devices on your LAN cannot connect to localhost! Open this host page using your LAN IP address.';
  }

  return result;
}
