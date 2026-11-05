// ============================================================
//  agent.js — Speech + Command Parser + Actions
//  No API key required. Rule-based fallback works offline.
//  LLM_HOOK below shows where to plug in a real LLM later.
// ============================================================

// ---------- Text-to-Speech ----------
export function speak(text) {
  if (!('speechSynthesis' in window)) {
    console.warn('TTS not supported');
    return;
  }
  window.speechSynthesis.cancel(); // stop any pending speech
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.05;
  u.pitch = 1.0;
  u.volume = 1.0;
  window.speechSynthesis.speak(u);
}

// ---------- Speech-to-Text ----------
export function listenOnce() {
  return new Promise((resolve) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      // Fallback: text input via prompt
      const typed = window.prompt('Speech not supported. Type a command:');
      resolve((typed || '').trim());
      return;
    }
    const r = new SR();
    r.lang = 'en-US';
    r.interimResults = false;
    r.continuous = false;
    r.maxAlternatives = 1;

    let settled = false;
    const done = (text) => {
      if (settled) return;
      settled = true;
      try { r.stop(); } catch {}
      resolve(text);
    };

    r.onresult = (e) => done(e.results[0][0].transcript.trim());
    r.onerror = (e) => {
      console.warn('Speech error:', e.error);
      if (e.error === 'no-speech' || e.error === 'network') {
        // fallback to prompt
        const typed = window.prompt('Could not hear you. Type a command:');
        done((typed || '').trim());
      } else {
        done('');
      }
    };
    r.onend = () => done('');

    try { r.start(); } catch (err) {
      console.warn('STT start failed:', err.message);
      const typed = window.prompt('Type a command:');
      done((typed || '').trim());
    }

    // Safety timeout — 8 seconds
    setTimeout(() => done(''), 8000);
  });
}

// ---------- Command Parser (rule-based, no LLM) ----------
// Returns: { action, params, narration }
export function parseCommand(text) {
  const t = (text || '').toLowerCase().trim();
  if (!t) return { action: 'unknown', params: {}, narration: "I didn't catch that." };

  // ---- grow ----
  if (/\b(grow|bigger|taller|rise|expand|bloom)\b/.test(t)) {
    let amount = 1.0;
    if (/\btall\b|\bbig\b|\bhuge\b/.test(t)) amount = 1.8;
    if (/\bsmall\b|\btiny\b|\blittle\b/.test(t)) amount = 0.5;
    return {
      action: 'grow',
      params: { amount },
      narration: 'Growing the archive.'
    };
  }

  // ---- shrink ----
  if (/\b(shrink|smaller|shorter|contract|collapse)\b/.test(t)) {
    return {
      action: 'grow',
      params: { amount: -0.6 },
      narration: 'The archive contracts.'
    };
  }

  // ---- recolor ----
  const colorMap = {
    blue: 0x4488ff, red: 0xff4444, green: 0x44ff88,
    purple: 0xaa66ff, gold: 0xffcc44, pink: 0xff66cc,
    cyan: 0x44ffee, orange: 0xff8844, white: 0xffffff
  };
  const colorMatch = Object.keys(colorMap).find((c) => t.includes(c));
  if (colorMatch) {
    return {
      action: 'recolor',
      params: { color: colorMap[colorMatch] },
      narration: `The archive turns ${colorMatch}.`
    };
  }

  // ---- rain ----
  if (/\b(rain|storm|water|shower|drizzle)\b/.test(t)) {
    return {
      action: 'rain',
      params: { duration: 5.0 },
      narration: 'The archive remembers water.'
    };
  }

  // ---- reset / new seed ----
  if (/\b(reset|new|restart|clear|fresh|seed)\b/.test(t)) {
    return {
      action: 'reset',
      params: {},
      narration: 'A new seed is planted.'
    };
  }

  // ---- narrate / story ----
  if (/\b(story|tell|narrate|describe|what)\b/.test(t)) {
    return {
      action: 'narrate',
      params: {},
      narration: 'This world began as a single seed. It grows when you reach for it, and it remembers every touch.'
    };
  }

  // ---- fallback ----
  return {
    action: 'unknown',
    params: {},
    narration: "I didn't understand that. Try: grow, turn blue, make it rain, or new seed."
  };
}

// ----------------------------------------------------------------
//  LLM_HOOK — plug in a real LLM later
// ----------------------------------------------------------------
// When you're ready to add real AI, replace parseCommand with:
//
//   export async function parseCommand(text) {
//     const res = await fetch('https://your-endpoint.com/api/agent', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ command: text })
//     });
//     return await res.json(); // { action, params, narration }
//   }
//
// Free endpoints to try later:
//   - Groq (llama-3.3-70b) — free tier
//   - Google Gemini — free tier
//   - Cloudflare Workers AI — free tier
// ----------------------------------------------------------------