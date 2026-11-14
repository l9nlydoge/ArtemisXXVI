import { MotionPreference } from './MotionPreference'

export class DockControls {
  yaw = 0.75
  pitch = 0.34
  enabled = false
  private dragging = false
  private lastX = 0
  private lastY = 0
  private idleSeconds = 10

  attach(element: HTMLElement): () => void {
    const down = (event: PointerEvent) => {
      if (!this.enabled) return
      this.dragging = true
      this.lastX = event.clientX
      this.lastY = event.clientY
    }
    const move = (event: PointerEvent) => {
      if (!this.dragging) return
      this.yaw -= (event.clientX - this.lastX) * 0.006
      this.pitch = Math.min(1.1, Math.max(-0.45, this.pitch + (event.clientY - this.lastY) * 0.004))
      this.lastX = event.clientX
      this.lastY = event.clientY
      this.idleSeconds = 0
    }
    const up = () => {
      this.dragging = false
    }
    element.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      element.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }

  advance(delta: number): void {
    this.idleSeconds += delta
    if (this.dragging || this.idleSeconds < 4 || MotionPreference.reduced) return
    this.yaw += delta * 0.06
  }
}
