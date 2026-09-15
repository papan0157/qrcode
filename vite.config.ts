import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function qrDirectRedirectPlugin(): Plugin {
  return {
    name: 'qr-direct-redirect',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || '';
        const match = url.match(/^\/q\/([a-zA-Z0-9_-]+)/);
        if (!match) return next();

        const code = match[1].toUpperCase();
        const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://utmyctoppfgcuviaqbgl.supabase.co';
        const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

        if (supabaseUrl && supabaseKey) {
          try {
            const resp = await fetch(`${supabaseUrl}/rest/v1/qr_codes?code=eq.${code}&select=*`, {
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
              },
            });

            if (resp.ok) {
              const rows: any = await resp.json();
              const qr = rows && rows[0];

              if (qr && qr.status === 'ATIVO' && qr.destination_url) {
                // Background scan logging in Supabase
                fetch(`${supabaseUrl}/rest/v1/qr_scans`, {
                  method: 'POST',
                  headers: {
                    apikey: supabaseKey,
                    Authorization: `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    qr_code_id: qr.id,
                    code: qr.code,
                    scanned_at: new Date().toISOString(),
                    user_agent: req.headers['user-agent'] || '',
                    referrer: req.headers['referer'] || null,
                  }),
                }).catch(() => {});

                fetch(`${supabaseUrl}/rest/v1/qr_codes?id=eq.${qr.id}`, {
                  method: 'PATCH',
                  headers: {
                    apikey: supabaseKey,
                    Authorization: `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    total_scans: (qr.total_scans || 0) + 1,
                    last_access_at: new Date().toISOString(),
                  }),
                }).catch(() => {});

                // Direct HTTP 302 redirect straight to destination URL
                res.statusCode = 302;
                res.setHeader('Location', qr.destination_url);
                res.end();
                return;
              }
            }
          } catch (err) {
            console.error('Direct server redirect error:', err);
          }
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [qrDirectRedirectPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
