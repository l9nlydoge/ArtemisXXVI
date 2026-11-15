export class CrinkleField {
  constructor(private readonly seed = 2026) {}

  sample(x: number, y: number, z: number): number {
    const broad = 1 - Math.abs(2 * this.noise(x, y, z) - 1)
    const fine = 1 - Math.abs(2 * this.noise(x * 2.7 + 11.3, y * 2.7 + 5.1, z * 2.7 + 3.7) - 1)
    return broad * broad * 0.72 + fine * fine * 0.28
  }

  private noise(x: number, y: number, z: number): number {
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const z0 = Math.floor(z)
    const fx = this.fade(x - x0)
    const fy = this.fade(y - y0)
    const fz = this.fade(z - z0)
    const mix = (a: number, b: number, t: number) => a + (b - a) * t
    const corner = (dx: number, dy: number, dz: number) => this.hash(x0 + dx, y0 + dy, z0 + dz)
    return mix(
      mix(mix(corner(0, 0, 0), corner(1, 0, 0), fx), mix(corner(0, 1, 0), corner(1, 1, 0), fx), fy),
      mix(mix(corner(0, 0, 1), corner(1, 0, 1), fx), mix(corner(0, 1, 1), corner(1, 1, 1), fx), fy),
      fz,
    )
  }

  private fade(t: number): number {
    return t * t * (3 - 2 * t)
  }

  private hash(x: number, y: number, z: number): number {
    let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1440662683) ^ this.seed
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }
}
