import { useEffect, useRef } from 'react'
import { useGameStore } from '../../State/GameStore'
import { Screen } from '../../State/Screen'
import { Orbit, OrbitPace } from '../Scene/Orbit'
import { SceneClock } from '../Scene/SceneClock'
import { SceneLayers, type SceneView } from '../Scene/SceneView'
import { MotionPreference } from '../Shared/MotionPreference'
import { EarthMap, GlobePad, GlobeRenderer } from './GlobeRenderer'
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
const StarRate = 0.14

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

interface Place {
  x: number
  y: number
  radius: number
  driftX: number
  driftY: number
}

interface Move {
  from: Place
  to: Place
  started: number
}

class BackdropScene {
  private readonly context: CanvasRenderingContext2D
  private readonly globes = new Map<Globe, GlobeRenderer>()
  private readonly stars = new Starfield()
  private readonly orbit = Orbit.shared
  private readonly clock = SceneClock.shared
  private readonly stopListening: () => void
  private width = 0
  private height = 0
  private scale = 4
  private ratio = 1
  private screen: Screen
  private target: Place = { x: 0, y: 0, radius: GlobeRadius[Globe.Medium], driftX: 0, driftY: 0 }
  private current: Place = this.target
  private move?: Move
  private signature = ''
  private disposed = false

  constructor(private readonly canvas: HTMLCanvasElement, screen: Screen) {
    this.context = canvas.getContext('2d')!
    this.screen = screen
    this.aimOrbit()
    const maps: [Globe, string][] = [[Globe.Large, 'EarthMapLarge'], [Globe.Medium, 'EarthMapMedium'], [Globe.Small, 'EarthMapSmall']]
    for (const [globe, file] of maps) {
      EarthMap.load(`${import.meta.env.BASE_URL}Backdrop/${file}.png`).then((map) => {
        if (this.disposed) return
        this.globes.set(globe, new GlobeRenderer(GlobeRadius[globe], map))
        this.signature = ''
      })
    }
    this.resize()
    this.stopListening = this.clock.listen((now, delta) => this.frame(now, delta))
  }

  dispose() {
    this.disposed = true
    this.stopListening()
  }

  resize() {
    this.ratio = window.devicePixelRatio || 1
    this.scale = Math.max(2, Math.round((window.innerHeight * this.ratio) / ArtRows))
    this.width = Math.ceil((window.innerWidth * this.ratio) / this.scale)
    this.height = Math.ceil((window.innerHeight * this.ratio) / this.scale)
    this.canvas.width = this.width
    this.canvas.height = this.height
    this.canvas.style.width = `${(this.width * this.scale) / this.ratio}px`
    this.canvas.style.height = `${(this.height * this.scale) / this.ratio}px`
    this.move = undefined
    this.target = this.place(this.screen)
    this.current = this.target
    this.signature = ''
  }

  show(screen: Screen) {
    if (screen === this.screen) return
    this.screen = screen
    this.aimOrbit()
    this.target = this.place(screen)
    if (MotionPreference.reduced) {
      this.move = undefined
      this.current = this.target
    } else {
      this.move = { from: { ...this.current }, to: this.target, started: this.clock.now }
    }
    this.signature = ''
  }

  private aimOrbit() {
    this.orbit.aim(this.screen === Screen.Flight ? OrbitPace.Scan : OrbitPace.Still)
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

  private globeFor(radius: number): Globe | undefined {
    return (Object.keys(GlobeRadius) as Globe[]).find((globe) => GlobeRadius[globe] === radius)
  }

  private frame(now: number, delta: number) {
    this.orbit.update(delta)
    if (this.move) {
      const progress = Math.min(1, (now - this.move.started) / TravelMs)
      const eased = 1 - (1 - progress) ** 3
      const { from, to } = this.move
      const mix = (a: number, b: number) => a + (b - a) * eased
      this.current = progress < 1 ? { x: mix(from.x, to.x), y: mix(from.y, to.y), radius: mix(from.radius, to.radius), driftX: mix(from.driftX, to.driftX), driftY: mix(from.driftY, to.driftY) } : to
      if (progress >= 1) this.move = undefined
    }
    const view = this.view
    const twinkle = MotionPreference.reduced ? 0 : Math.floor(now / TwinkleMs) % 3
    const globe = this.globeFor(this.current.radius)
    const turnStep = Math.floor(this.orbit.turn * 1600)
    const signature = this.move ? `move ${now}` : `${twinkle} ${turnStep} ${Math.floor(this.orbit.offset * StarRate)} ${globe}`
    const layersWant = [...SceneLayers.shared.all].some((layer) => layer.needsPaint(now))
    if (signature === this.signature && !layersWant) return
    this.signature = signature
    this.paint(view, twinkle, now)
  }

  private get view(): SceneView {
    return {
      width: this.width,
      height: this.height,
      scale: this.scale,
      ratio: this.ratio,
      earth: { x: this.current.x, y: this.current.y, radius: this.current.radius },
      settled: !this.move,
    }
  }

  private paint(view: SceneView, twinkle: number, now: number) {
    const { context, current } = this
    context.imageSmoothingEnabled = false
    context.fillStyle = '#000000'
    context.fillRect(0, 0, this.width, this.height)
    const starShift = Math.floor(this.orbit.offset * StarRate)
    this.stars.paint(context, this.width, this.height, Math.round(current.driftX) + starShift, Math.round(current.driftY), twinkle)
    this.paintEarth()
    for (const layer of SceneLayers.shared.all) layer.paint(context, view, now)
  }

  private paintEarth() {
    const { context, current } = this
    const settled = this.globeFor(current.radius)
    const turn = this.orbit.turn
    if (!this.move && settled) {
      const renderer = this.globes.get(settled)
      if (!renderer) return
      const left = current.x - current.radius - GlobePad
      const top = current.y - current.radius - GlobePad
      if (top >= this.height || left >= this.width || left + renderer.size <= 0) return
      const image = renderer.draw(turn, -top, this.height - top)
      context.drawImage(image, left, top)
      return
    }
    const large = this.globes.get(Globe.Large)
    if (!large) return
    const left = Math.round(current.x - current.radius)
    const right = Math.round(current.x + current.radius)
    const top = Math.round(current.y - current.radius)
    const bottom = Math.round(current.y + current.radius)
    if (top >= this.height || left >= this.width || right <= 0) return
    const image = large.draw(turn)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, GlobePad, GlobePad, large.radius * 2, large.radius * 2, left, top, right - left, bottom - top)
    context.imageSmoothingEnabled = false
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
