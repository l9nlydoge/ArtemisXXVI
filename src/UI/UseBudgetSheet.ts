import { useMemo } from 'react'
import { Catalog } from '../Engine/Catalog/Catalog'
import { ResolvedDesign } from '../Engine/Design/ResolvedDesign'
import { BudgetSheet } from '../Engine/Models/BudgetSheet'
import { useGameStore } from '../State/GameStore'

export function useBudgetSheet(): BudgetSheet {
  const design = useGameStore((state) => state.design)
  const scenarioId = useGameStore((state) => state.scenarioId)
  const difficulty = useGameStore((state) => state.difficulty)
  return useMemo(() => BudgetSheet.evaluate(new ResolvedDesign(design, Catalog.shared.scenarios.get(scenarioId), difficulty)), [design, scenarioId, difficulty])
}
