import { defineConfig } from 'vite';

const REPO_NAME = 'living_achive'; // matches github.com/maxwelmwala0888/living_achive

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? `/${REPO_NAME}/` : '/',
  server: { host: true, port: 5173 },
  build: { target: 'esnext', outDir: 'dist' }
});