import { useEffect, useRef } from 'react'
import { useGameStore } from '../../State/GameStore'
import { Screen } from '../../State/Screen'
import { MotionPreference } from '../Shared/MotionPreference'
import { Starfield } from './Starfield'

enum Globe {
  Large = 'Large',
  Medium = 'Medium',
  Small = 'Small',
}

const GlobeRadius: Readonly<Record<Globe, number>> = { [Globe.Large]: 250, [Globe.Medium]: 125, [Globe.Small]: 70 }
const GlobePad = 3
const ArtRows = 225
const SlideMs = 900
const TwinkleMs = 650

interface Framing {
  globe: Globe
  x: number
  y: number
  drift: [number, number]
}

const Framings: Readonly<Record<Screen, Framing>> = {
  [Screen.Home]: { globe: Globe.Medium, x: 0.74, y: -0.03, drift: [0, 0] },
  [Screen.Week]: { globe: Globe.Large, x: 0.5, y: 0.64, drift: [-8, -14] },
  [Screen.Hangar]: { globe: Globe.Large, x: 0.47, y: 0.76, drift: [-14, -22] },
  [Screen.Flight]: { globe: Globe.Large, x: 0.54, y: 0.62, drift: [6, -18] },
  [Screen.Debrief]: { globe: Globe.Large, x: 0.5, y: 0.43, drift: [0, -8] },
  [Screen.Lab]: { globe: Globe.Small, x: 0.86, y: 0.49, drift: [16, -4] },
}

interface Point {
  x: number
  y: number
}

class BackdropScene {
  private readonly context: CanvasRenderingContext2D
  private readonly images = new Map<Globe, HTMLImageElement>()
  private readonly stars = new Starfield()
  private width = 0
  private height = 0
  private scale = 4
  private screen: Screen
  private from = new Map<Globe | 'Drift', Point>()
  private current = new Map<Globe | 'Drift', Point>()
  private slideStart = 0
  private frame = 0
  private twinkle = 0
  private animation = 0
  private twinkleTimer = 0

  constructor(private readonly canvas: HTMLCanvasElement, screen: Screen) {
    this.context = canvas.getContext('2d')!
    this.screen = screen
    for (const globe of Object.values(Globe)) {
      const image = new Image()
      image.onload = () => this.draw()
      image.src = `${import.meta.env.BASE_URL}Backdrop/Earth${globe}.png`
      this.images.set(globe, image)
    }
    this.resize()
    if (!MotionPreference.reduced) this.twinkleTimer = window.setInterval(() => this.tick(), TwinkleMs)
  }

  dispose() {
    cancelAnimationFrame(this.animation)
    clearInterval(this.twinkleTimer)
  }

  resize() {
    const ratio = window.devicePixelRatio || 1
    this.scale = Math.max(2, Math.round((window.innerHeight * ratio) / ArtRows))
    this.width = Math.ceil((window.innerWidth * ratio) / this.scale)
    this.height = Math.ceil((window.innerHeight * ratio) / this.scale)
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.canvas.style.width = `${(this.width * this.scale) / ratio}px`
    this.canvas.style.height = `${(this.height * this.scale) / ratio}px`
    this.context.imageSmoothingEnabled = false
    this.current = this.targets(this.screen)
    this.draw()
  }

  show(screen: Screen) {
    if (screen === this.screen) return
    this.screen = screen
    const targets = this.targets(screen)
    if (MotionPreference.reduced) {
      this.current = targets
      this.draw()
      return
    }
    this.from = new Map(this.current)
    this.slideStart = performance.now()
    cancelAnimationFrame(this.animation)
    const step = (now: number) => {
      const progress = Math.min(1, (now - this.slideStart) / SlideMs)
      const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2
      for (const [key, target] of targets) {
        const start = this.from.get(key) ?? target
        this.current.set(key, { x: Math.round(start.x + (target.x - start.x) * eased), y: Math.round(start.y + (target.y - start.y) * eased) })
      }
      this.draw()
      if (progress < 1) this.animation = requestAnimationFrame(step)
    }
    this.animation = requestAnimationFrame(step)
  }

  private tick() {
    this.twinkle = (this.twinkle + 1) % 3
    this.draw()
  }

  private targets(screen: Screen): Map<Globe | 'Drift', Point> {
    const framing = Framings[screen]
    const targets = new Map<Globe | 'Drift', Point>()
    const unit = this.height / ArtRows
    for (const globe of Object.values(Globe)) {
      const radius = GlobeRadius[globe]
      const x = Math.round(this.width * framing.x)
      const y = Math.round(this.height * framing.y) + radius
      targets.set(globe, globe === framing.globe ? { x, y } : { x, y: this.height + radius + GlobePad + 8 })
    }
    targets.set('Drift', { x: Math.round(framing.drift[0] * unit), y: Math.round(framing.drift[1] * unit) })
    return targets
  }

  private draw() {
    if (this.frame) return
    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      this.paint()
    })
  }

  private paint() {
    const { context } = this
    context.fillStyle = '#000000'
    context.fillRect(0, 0, this.width, this.height)
    const drift = this.current.get('Drift') ?? { x: 0, y: 0 }
    this.stars.paint(context, this.width, this.height, drift.x, drift.y, this.twinkle)
    for (const globe of Object.values(Globe)) {
      const image = this.images.get(globe)
      const centre = this.current.get(globe)
      if (!image?.complete || !image.naturalWidth || !centre) continue
      const radius = GlobeRadius[globe]
      const left = centre.x - radius - GlobePad
      const top = centre.y - radius - GlobePad
      if (top >= this.height || left >= this.width || left + image.naturalWidth <= 0) continue
      context.drawImage(image, left, top)
    }
  }
}

export function Backdrop() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const scene = useRef<BackdropScene | null>(null)
  const screen = useGameStore((state) => state.screen)

  useEffect(() => {
    if (!canvas.current) return
    const created = new BackdropScene(canvas.current, useGameStore.getState().screen)
    scene.current = created
    const onResize = () => created.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      created.dispose()
      scene.current = null
    }
  }, [])

  useEffect(() => {
    scene.current?.show(screen)
  }, [screen])

  return (
    <div className="Backdrop" aria-hidden="true">
      <canvas ref={canvas} className="BackdropCanvas" />
    </div>
  )
}
