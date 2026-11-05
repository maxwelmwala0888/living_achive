export class TalkButton {
  constructor(onPress) { this.onPress = onPress; this.isPressed = false; }
  press()   { this.isPressed = true;  this.onPress?.(); }
  release() { this.isPressed = false; }
}