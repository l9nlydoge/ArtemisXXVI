import { Rules } from '../Core/Rules'
import type { SeededRandom } from '../Core/SeededRandom'
import type { SolarStorm } from '../Events/SolarStorm'
import type { SpaceEvent } from '../Events/SpaceEvent'

export interface TurnCondition {
  signal: number
  radiation: number
  inShadow: boolean
  anomaly: boolean
}

export class ConditionRoller {
  constructor(private readonly random: SeededRandom) {}

  roll(event: SpaceEvent, overlay: SolarStorm | undefined, stormLeg: boolean): TurnCondition[] {
    const conditions: TurnCondition[] = []
    event.turns.forEach((turn, index) => {
      const inShadow = index > 0 && !conditions[index - 1].inShadow && this.random.chance(Rules.shadowChance)
      const anomaly = !stormLeg && this.random.chance(Rules.anomalyChance)
      const weather = overlay ? ConditionRoller.weather(overlay, index, event.turnCount) : 0
      conditions.push({
        signal: turn.signal,
        radiation: turn.radiation + weather + (anomaly ? Rules.anomalyRadiation : 0),
        inShadow,
        anomaly,
      })
    })
    return conditions
  }

  static weather(storm: SolarStorm, turnIndex: number, turnCount: number): number {
    const span = storm.turnCount
    const stormTurn = turnCount >= span ? Math.floor((turnIndex * span) / turnCount) : Math.floor((span - turnCount) / 2) + turnIndex
    return storm.turns[stormTurn].radiation
  }
}
