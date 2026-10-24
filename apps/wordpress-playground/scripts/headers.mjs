/** Security policy for the launcher. The embedded Playground owns its policy. */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  'frame-src https://playground.wordpress.net',
  [
    "connect-src 'self'",
    'https://playground.wordpress.net',
    'https://raw.githubusercontent.com',
    'https://api.wordpress.org',
    'https://downloads.wordpress.org',
    'http://127.0.0.1:*',
    'ws://127.0.0.1:*',
  ].join(' '),
  "worker-src 'self' blob:",
  "form-action 'none'",
].join('; ');

export const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': CONTENT_SECURITY_POLICY,
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
});
