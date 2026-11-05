// Detects horizontal planes (desk/table) and exposes the anchor point.
export class SceneUnderstandingSystem {
  constructor(world) { this.world = world; this.detected = []; }
  init() {
    // TODO: enable IWSDK plane detection
    // On horizontal plane found -> this.detected.push(plane)
  }
  getDeskAnchor() { return this.detected[0]?.center ?? null; }
}