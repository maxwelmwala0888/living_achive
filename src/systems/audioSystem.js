export class AudioSystem {
  constructor(world) { this.world = world; }
  init() { /* TODO: preload spatial sounds */ }
  playAt(name, position) { console.log('sound:', name, position); }
}