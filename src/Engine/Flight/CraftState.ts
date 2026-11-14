import type { Spacecraft } from '../Spacecraft/Spacecraft'

export class CraftState {
  charge: number
  hull: number
  burnsLeft: number
  repairUsed = false

  constructor(craft: Spacecraft) {
    this.charge = craft.capacity
    this.hull = craft.maxHull
    this.burnsLeft = craft.burns
  }
}
