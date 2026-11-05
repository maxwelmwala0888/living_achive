import { CONFIG } from './config.js';

export async function askAgent(command, context = {}) {
  const res = await fetch(CONFIG.LLM_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, context })
  });
  if (!res.ok) throw new Error('Agent request failed: ' + res.status);
  return res.json();
}