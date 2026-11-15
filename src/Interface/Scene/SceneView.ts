export interface EarthPlace {
  x: number
  y: number
  radius: number
}

export interface SceneView {
  width: number
  height: number
  scale: number
  ratio: number
  earth: EarthPlace
  settled: boolean
}

export interface SceneLayer {
  paint(context: CanvasRenderingContext2D, view: SceneView, now: number): void
  needsPaint(now: number): boolean
}

export interface EarthHold {
  place?: EarthPlace
}

export interface EarthRelease {
  from?: EarthPlace
  snap: boolean
}

export class SceneLayers {
  static readonly shared = new SceneLayers()
  private readonly layers = new Set<SceneLayer>()
  earth?: EarthHold
  released?: EarthRelease

  holdEarth(place?: EarthPlace) {
    this.earth = { place }
    this.released = undefined
  }

  releaseEarth(from: EarthPlace | undefined, snap: boolean) {
    if (!this.earth) return
    this.earth = undefined
    this.released = { from, snap }
  }

  add(layer: SceneLayer): () => void {
    this.layers.add(layer)
    return () => this.layers.delete(layer)
  }

  get all(): ReadonlySet<SceneLayer> {
    return this.layers
  }

  toScreen(view: SceneView, x: number, y: number): { left: number; top: number } {
    return { left: (x * view.scale) / view.ratio, top: (y * view.scale) / view.ratio }
  }

  toArt(view: SceneView, left: number, top: number): { x: number; y: number } {
    return { x: Math.round((left * view.ratio) / view.scale), y: Math.round((top * view.ratio) / view.scale) }
  }
}
