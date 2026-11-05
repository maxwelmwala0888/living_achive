import { defineConfig } from 'vite';

// IMPORTANT: Change this to your actual GitHub repo name
const REPO_NAME = 'living-archive';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? `/${REPO_NAME}/` : '/',
  server: { host: true, port: 5173 },
  build: { target: 'esnext', outDir: 'dist' }
});