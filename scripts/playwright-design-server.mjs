import { spawn } from 'node:child_process';

const vite = spawn(process.execPath, [
  'node_modules/vite/bin/vite.js',
  '--host', '127.0.0.1',
  '--port', '4177',
  '--strictPort',
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_DEPLOYMENT_SURFACE: 'unified',
    VITE_SUPABASE_URL: 'https://design-preview.invalid',
    VITE_SUPABASE_ANON_KEY: 'local-design-test-key',
    VITE_APP_SCHEMA_READS: 'true',
    VITE_PILOT_WRITES: 'false',
    VITE_BYODB_ENABLED: 'false',
    PUBLIC_APP_URL: 'http://127.0.0.1:4177',
    PUBLIC_LANDING_URL: 'http://127.0.0.1:4177',
  },
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => vite.kill(signal));
}

vite.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
