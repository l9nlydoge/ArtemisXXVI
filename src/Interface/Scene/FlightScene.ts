import type { Loadout } from '../../Engine/Spacecraft/Loadout'
import { MotionPreference } from '../Shared/MotionPreference'
import { CraftActor } from './CraftActor'
import { Orbit, OrbitPace } from './Orbit'
import { SceneClock } from './SceneClock'
import { SceneLayers, type SceneLayer, type SceneView } from './SceneView'

export interface SceneEffect {
  paint(context: CanvasRenderingContext2D, view: SceneView, now: number, scene: FlightScene): boolean
}

export interface StageRect {
  left: number
  top: number
  width: number
  height: number
}

export enum SceneMode {
  Hidden = 'Hidden',
  Scanner = 'Scanner',
  Encounter = 'Encounter',
  Travel = 'Travel',
  Launch = 'Launch',
}

export interface ScenePart {
  paint(context: CanvasRenderingContext2D, view: SceneView, now: number, scene: FlightScene): void
  paintBack?(context: CanvasRenderingContext2D, view: SceneView, now: number, scene: FlightScene): void
}

export class FlightScene implements SceneLayer {
  static readonly shared = new FlightScene()
  readonly craft = new CraftActor()
  readonly orbit = Orbit.shared
  readonly clock = SceneClock.shared
  private effects: SceneEffect[] = []
  private parts = new Map<string, ScenePart>()
  private sceneMode = SceneMode.Hidden
  private stageRect: StageRect = { left: 0, top: 0, width: 0, height: 0 }
  private craftAnchor = { x: 0.5, y: 0.5 }
  private lastView?: SceneView
  private detach?: () => void

  get mode(): SceneMode {
    return this.sceneMode
  }

  get view(): SceneView | undefined {
    return this.lastView
  }

  get stage(): StageRect {
    return this.stageRect
  }

  get now(): number {
    return this.clock.now
  }

  show(mode: SceneMode) {
    if (mode !== SceneMode.Hidden && !this.detach) {
      this.detach = SceneLayers.shared.add(this)
      this.craft.mend()
    }
    if (mode === SceneMode.Hidden) {
      this.detach?.()
      this.detach = undefined
      this.effects = []
      this.parts.clear()
    }
    this.sceneMode = mode
    if (mode === SceneMode.Encounter) this.orbit.aim(OrbitPace.Calm)
    if (mode === SceneMode.Scanner) this.orbit.aim(OrbitPace.Scan)
  }

  setLoadout(loadout: Loadout, active?: ReadonlySet<string>) {
    this.craft.setLoadout(loadout, active)
  }

  setStage(rect: StageRect, anchor = { x: 0.5, y: 0.5 }, instant = false) {
    this.stageRect = rect
    this.craftAnchor = anchor
    this.placeCraft(instant)
  }

  setPart(name: string, part: ScenePart | undefined) {
    if (part) this.parts.set(name, part)
    else this.parts.delete(name)
  }

  part<T extends ScenePart>(name: string): T | undefined {
    return this.parts.get(name) as T | undefined
  }

  add(effect: SceneEffect) {
    this.effects.push(effect)
  }

  toArt(left: number, top: number): { x: number; y: number } {
    const view = this.lastView
    if (!view) return { x: 0, y: 0 }
    return SceneLayers.shared.toArt(view, left, top)
  }

  stageArt(): { left: number; top: number; right: number; bottom: number } {
    const a = this.toArt(this.stageRect.left, this.stageRect.top)
    const b = this.toArt(this.stageRect.left + this.stageRect.width, this.stageRect.top + this.stageRect.height)
    return { left: a.x, top: a.y, right: b.x, bottom: b.y }
  }

  needsPaint(): boolean {
    return this.sceneMode !== SceneMode.Hidden
  }

  paint(context: CanvasRenderingContext2D, view: SceneView, now: number) {
    const fresh = !this.lastView || this.lastView.scale !== view.scale || this.lastView.width !== view.width || this.lastView.height !== view.height
    this.lastView = view
    if (fresh) this.placeCraft(true)
    if (!view.settled && !this.parts.has('Launch')) return
    const still = MotionPreference.reduced
    for (const part of this.parts.values()) part.paintBack?.(context, view, now, this)
    this.craft.paint(context, now, still)
    for (const name of ['Contact', 'Beams', 'Front', 'Launch']) this.parts.get(name)?.paint(context, view, now, this)
    this.effects = this.effects.filter((effect) => effect.paint(context, view, now, this))
  }

  private placeCraft(instant: boolean) {
    if (!this.lastView) return
    const stage = this.stageArt()
    const x = Math.round(stage.left + (stage.right - stage.left) * this.craftAnchor.x)
    const y = Math.round(stage.top + (stage.bottom - stage.top) * this.craftAnchor.y)
    const now = this.clock.now
    const snap = instant || MotionPreference.reduced
    this.craft.x.set(x, now, snap)
    this.craft.y.set(y, now, snap)
  }
}
