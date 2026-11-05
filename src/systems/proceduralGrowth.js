// Grows structures from a seed based on hand/voice actions.
export class ProceduralGrowthSystem {
  constructor(world) { this.world = world; this.seeds = new Map(); }
  init() { /* ready */ }
  spawnSeed(position) {
    const id = 'seed-' + Date.now();
    this.seeds.set(id, { position, height: 0, branches: [] });
    // TODO: create glowing seed mesh at position
    return id;
  }
  grow(id, intensity = 1) {
    const s = this.seeds.get(id); if (!s) return;
    s.height = Math.min(s.height + 0.02 * intensity, 0.5);
    // TODO: scale the structure mesh
  }
  branch(id) {
    const s = this.seeds.get(id); if (!s) return;
    s.branches.push({ at: s.height });
    // TODO: spawn branch mesh
  }
  recolor(id, color) { /* TODO */ }
}