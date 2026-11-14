type Tree = Record<string, unknown>

export class PathTree {
  constructor(private root: Tree = {}) {}

  get value(): Tree {
    return this.root
  }

  put(path: string, value: unknown): void {
    if (!path) {
      this.root = structuredClone(value) as Tree
      return
    }
    const { parent, leaf } = this.locate(path)
    parent[leaf] = structuredClone(value)
  }

  merge(path: string, value: object): void {
    const { parent, leaf } = this.locate(path)
    const existing = (parent[leaf] ?? {}) as Tree
    parent[leaf] = { ...existing, ...structuredClone(value) }
  }

  remove(path: string): void {
    const { parent, leaf } = this.locate(path)
    delete parent[leaf]
  }

  private locate(path: string): { parent: Tree; leaf: string } {
    const parts = path.split('/')
    const leaf = parts.pop()!
    let parent = this.root
    for (const part of parts) {
      parent[part] = (parent[part] ?? {}) as Tree
      parent = parent[part] as Tree
    }
    return { parent, leaf }
  }
}
