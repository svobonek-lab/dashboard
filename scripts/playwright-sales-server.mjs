import { spawn } from 'node:child_process';

const port = process.env.SALES_TEST_PORT;
const surface = process.env.SALES_TEST_SURFACE;
if (!port || !surface) throw new Error('Sales test port and surface are required');

const vite = spawn(process.execPath, [
  'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', port, '--strictPort',
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_DEPLOYMENT_SURFACE: surface,
    VITE_SUPABASE_URL: 'https://sales-test.invalid',
    VITE_SUPABASE_ANON_KEY: 'synthetic-test-key',
    VITE_PILOT_WRITES: 'false',
    VITE_PAID_REGISTRATION_ENABLED: 'false',
    PUBLIC_APP_URL: process.env.SALES_TEST_APP_URL ?? '',
    PUBLIC_LANDING_URL: 'http://127.0.0.1:4177',
  },
});

for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => vite.kill(signal));
vite.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
