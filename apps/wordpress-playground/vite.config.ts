import {defineConfig} from 'vite';

// The workshop always runs at http://127.0.0.1:5173/. The MCP launcher's
// --url (scripts/antigravity-setup.mjs) advertises this same origin, so agents
// check this port first. strictPort fails loudly instead of drifting to 5174.
export default defineConfig({
  server: {host: '127.0.0.1', port: 5173, strictPort: true},
});
