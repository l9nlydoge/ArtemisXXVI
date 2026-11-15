import type { SoundSystem } from './Sound'

export class InputFeedback {
  static readonly controls = 'button, a[href], [role="button"], [role="tab"], [role="switch"], [role="checkbox"], input[type="checkbox"], input[type="radio"], input[type="range"], select, summary'
  static readonly quietCues = new Set(['Hover', 'Press', 'Release'])
  static readonly suppressMs = 80
  private lastMeaningful = -Infinity
  private stopListening?: () => void
  private readonly removers: (() => void)[] = []

  constructor(private readonly sound: SoundSystem, private readonly target: Document = document) {}

  start(): void {
    if (this.removers.length > 0) return
    this.stopListening = this.sound.onCue((record) => {
      if (!InputFeedback.quietCues.has(record.name)) this.lastMeaningful = record.at
    })
    this.listen('pointerdown', (event) => this.down(event as PointerEvent), true)
    this.listen('click', (event) => this.click(event as MouseEvent))
    this.listen('pointerover', (event) => this.over(event as PointerEvent))
    this.listen('keydown', (event) => this.key(event as KeyboardEvent))
    this.listen('visibilitychange', () => (this.target.hidden ? this.sound.pause() : this.sound.resume()))
  }

  stop(): void {
    this.stopListening?.()
    for (const remove of this.removers.splice(0)) remove()
  }

  static control(target: EventTarget | null): HTMLElement | undefined {
    if (!(target instanceof Element)) return undefined
    const found = target.closest(InputFeedback.controls)
    return found instanceof HTMLElement ? found : undefined
  }

  static isDisabled(element: HTMLElement): boolean {
    return (element as HTMLButtonElement).disabled === true || element.getAttribute('aria-disabled') === 'true'
  }

  private listen(type: string, handler: (event: Event) => void, capture = false): void {
    const guarded = (event: Event) => {
      try {
        handler(event)
      } catch {
        return
      }
    }
    this.target.addEventListener(type, guarded, { capture, passive: true })
    this.removers.push(() => this.target.removeEventListener(type, guarded, { capture }))
  }

  private down(event: PointerEvent): void {
    this.sound.unlock()
    if (event.button !== 0) return
    const control = InputFeedback.control(event.target)
    if (!control) return
    this.sound.play(InputFeedback.isDisabled(control) ? 'Denied' : 'Press')
  }

  private click(event: MouseEvent): void {
    this.sound.unlock()
    const control = InputFeedback.control(event.target)
    if (!control || InputFeedback.isDisabled(control)) return
    if (performance.now() - this.lastMeaningful < InputFeedback.suppressMs) return
    this.sound.play('Release')
  }

  private over(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') return
    const control = InputFeedback.control(event.target)
    if (!control || InputFeedback.isDisabled(control)) return
    const from = event.relatedTarget
    if (from instanceof Node && control.contains(from)) return
    this.sound.play('Hover')
  }

  private key(event: KeyboardEvent): void {
    this.sound.unlock()
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
    if (event.key !== 'm' && event.key !== 'M') return
    const active = this.target.activeElement
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement || (active instanceof HTMLElement && active.isContentEditable)) return
    this.sound.toggle()
  }
}
