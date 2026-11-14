export class GraphicsSupport {
  private static cached?: boolean

  static get webgl(): boolean {
    if (GraphicsSupport.cached === undefined) {
      try {
        GraphicsSupport.cached = Boolean(document.createElement('canvas').getContext('webgl2'))
      } catch {
        GraphicsSupport.cached = false
      }
    }
    return GraphicsSupport.cached
  }
}
