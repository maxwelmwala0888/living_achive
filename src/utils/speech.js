// Browser speech-to-text + text-to-speech
export function createRecognizer() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) throw new Error('SpeechRecognition unsupported in this browser');
  const r = new SR();
  r.lang = 'en-US';
  r.interimResults = false;
  r.continuous = false;
  return r;
}

export function speak(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.0; u.pitch = 1.0;
  window.speechSynthesis.speak(u);
}