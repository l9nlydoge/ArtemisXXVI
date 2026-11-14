import { useMemo } from 'react'
import { Catalog } from '../Engine/Catalog/Catalog'
import type { Scenario } from '../Engine/Catalog/Scenario'
import { ResolvedDesign } from '../Engine/Design/ResolvedDesign'
import { BudgetSheet } from '../Engine/Models/BudgetSheet'
import { useGameStore } from '../State/GameStore'

export interface Mission {
  scenario: Scenario
  resolved: ResolvedDesign
  sheet: BudgetSheet
}

export function useMission(): Mission {
  const design = useGameStore((state) => state.design)
  const scenarioId = useGameStore((state) => state.scenarioId)
  const difficulty = useGameStore((state) => state.difficulty)
  return useMemo(() => {
    const scenario = Catalog.shared.scenarios.get(scenarioId)
    const resolved = new ResolvedDesign(design, scenario, difficulty)
    return { scenario, resolved, sheet: BudgetSheet.evaluate(resolved) }
  }, [design, scenarioId, difficulty])
}
