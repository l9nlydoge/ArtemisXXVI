export type SceneListener = (now: number, delta: number) => void

const LongestStep = 50

export class SceneClock {
  static readonly shared = new SceneClock()
  private readonly listeners = new Set<SceneListener>()
  private time = 0
  private last = 0
  private frame = 0
  private manual = false

  get now(): number {
    return this.time
  }

  get isManual(): boolean {
    return this.manual
  }

  listen(listener: SceneListener): () => void {
    this.listeners.add(listener)
    this.start()
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0) this.stop()
    }
  }

  freeze() {
    this.manual = true
    this.stop()
  }

  release() {
    this.manual = false
    this.start()
  }

  step(milliseconds: number, slices = 1) {
    for (let slice = 0; slice < slices; slice++) this.advance(milliseconds / slices)
  }

  private start() {
    if (this.frame || this.manual || typeof requestAnimationFrame !== 'function') return
    this.last = performance.now()
    this.frame = requestAnimationFrame((now) => this.loop(now))
  }

  private stop() {
    if (this.frame) cancelAnimationFrame(this.frame)
    this.frame = 0
  }

  private loop(now: number) {
    this.frame = 0
    if (this.manual) return
    const delta = typeof document !== 'undefined' && document.hidden ? 0 : Math.min(LongestStep, Math.max(0, now - this.last))
    this.last = now
    this.advance(delta)
    if (this.listeners.size > 0) this.frame = requestAnimationFrame((next) => this.loop(next))
  }

  private advance(delta: number) {
    this.time += delta
    for (const listener of this.listeners) listener(this.time, delta)
  }
}

declare global {
  interface Window {
    __SceneClock?: SceneClock
  }
}

if (import.meta.env?.DEV && typeof window !== 'undefined') window.__SceneClock = SceneClock.shared
