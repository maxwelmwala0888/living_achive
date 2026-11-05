import { askAgent } from '../utils/llmClient.js';
import { createRecognizer, speak } from '../utils/speech.js';

export class AIAgentSystem {
  constructor(world, systems) { this.world = world; this.systems = systems; }
  init() { this.recognizer = createRecognizer(); }

  async listenOnce() {
    const text = await new Promise((resolve, reject) => {
      this.recognizer.onresult = e => resolve(e.results[0][0].transcript);
      this.recognizer.onerror = reject;
      this.recognizer.start();
    });
    const reply = await askAgent(text, { scene: 'desk' });
    this.execute(reply);
    if (reply.narration) speak(reply.narration);
  }

  execute(reply) {
    // TODO: route reply.action to growth / audio / ui systems
    console.log('Agent reply:', reply);
  }
}