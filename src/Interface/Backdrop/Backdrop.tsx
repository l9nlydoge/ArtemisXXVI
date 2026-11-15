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
const ArtRows = 225
const TravelMs = 850
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
  [Screen.Logbook]: { globe: Globe.Large, x: 0.5, y: 0.82, drift: [-6, -10] },
  [Screen.Sources]: { globe: Globe.Small, x: 0.86, y: 0.62, drift: [12, -6] },
}

interface Place {
  x: number
  y: number
  radius: number
  driftX: number
  driftY: number
}

class BackdropScene {
  private readonly context: CanvasRenderingContext2D
  private readonly images = new Map<Globe, HTMLImageElement>()
  private readonly stars = new Starfield()
  private width = 0
  private height = 0
  private scale = 4
  private screen: Screen
  private current: Place = { x: 0, y: 0, radius: GlobeRadius[Globe.Medium], driftX: 0, driftY: 0 }
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
    cancelAnimationFrame(this.animation)
    this.current = this.place(this.screen)
    this.draw()
  }

  show(screen: Screen) {
    if (screen === this.screen) return
    this.screen = screen
    const target = this.place(screen)
    cancelAnimationFrame(this.animation)
    if (MotionPreference.reduced) {
      this.current = target
      this.draw()
      return
    }
    const from = { ...this.current }
    const started = performance.now()
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / TravelMs)
      const eased = 1 - (1 - progress) ** 3
      const mix = (a: number, b: number) => a + (b - a) * eased
      this.current = progress < 1 ? { x: mix(from.x, target.x), y: mix(from.y, target.y), radius: mix(from.radius, target.radius), driftX: mix(from.driftX, target.driftX), driftY: mix(from.driftY, target.driftY) } : target
      this.draw()
      if (progress < 1) this.animation = requestAnimationFrame(step)
    }
    this.animation = requestAnimationFrame(step)
  }

  private tick() {
    this.twinkle = (this.twinkle + 1) % 3
    this.draw()
  }

  private place(screen: Screen): Place {
    const framing = Framings[screen]
    const radius = GlobeRadius[framing.globe]
    const unit = this.height / ArtRows
    return {
      x: Math.round(this.width * framing.x),
      y: Math.round(this.height * framing.y) + radius,
      radius,
      driftX: Math.round(framing.drift[0] * unit),
      driftY: Math.round(framing.drift[1] * unit),
    }
  }

  private source(radius: number): Globe {
    const globes = Object.values(Globe)
    return globes.reduce((best, globe) => (Math.abs(Math.log(radius / GlobeRadius[globe])) < Math.abs(Math.log(radius / GlobeRadius[best])) ? globe : best), globes[0])
  }

  private draw() {
    if (this.frame) return
    this.frame = requestAnimationFrame(() => {
      this.frame = 0
      this.paint()
    })
  }

  private paint() {
    const { context, current } = this
    context.fillStyle = '#000000'
    context.fillRect(0, 0, this.width, this.height)
    this.stars.paint(context, this.width, this.height, Math.round(current.driftX), Math.round(current.driftY), this.twinkle)
    const globe = this.source(current.radius)
    const image = this.images.get(globe)
    if (!image?.complete || !image.naturalWidth) return
    const size = Math.round(image.naturalWidth * (current.radius / GlobeRadius[globe]))
    const left = Math.round(current.x - size / 2)
    const top = Math.round(current.y - size / 2)
    if (top >= this.height || left >= this.width || left + size <= 0) return
    context.drawImage(image, left, top, size, size)
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
