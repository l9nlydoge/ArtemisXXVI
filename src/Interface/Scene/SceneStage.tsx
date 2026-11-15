import { useEffect, useLayoutEffect, type RefObject } from 'react'
import type { Loadout } from '../../Engine/Spacecraft/Loadout'
import { FlightScene, SceneMode, type StageRect } from './FlightScene'

const RoomForCraft = 200

function rectOf(element: Element | null): StageRect | undefined {
  if (!element) return undefined
  const box = element.getBoundingClientRect()
  return { left: box.left, top: box.top, width: box.width, height: box.height }
}

function measure(root: HTMLElement, mode: SceneMode): { rect: StageRect; anchor: { x: number; y: number } } | undefined {
  if (mode === SceneMode.Encounter) {
    const stage = rectOf(root.querySelector('.EncounterStage'))
    return stage && { rect: stage, anchor: { x: 0.5, y: 0.5 } }
  }
  const view = rectOf(root.querySelector('.ScannerView, .TravelView')) ?? rectOf(root)
  if (!view) return undefined
  const cards = [...root.querySelectorAll('.ContactCard')].map((card) => card.getBoundingClientRect())
  const row = cards.length === 0 ? undefined : { left: Math.min(...cards.map((c) => c.left)), top: Math.min(...cards.map((c) => c.top)), width: Math.max(...cards.map((c) => c.right)) - Math.min(...cards.map((c) => c.left)), height: Math.max(...cards.map((c) => c.bottom)) - Math.min(...cards.map((c) => c.top)) }
  if (!row || row.width === 0) return { rect: view, anchor: { x: 0.5, y: 0.45 } }
  const rightGap = view.left + view.width - (row.left + row.width)
  const leftGap = row.left - view.left
  if (rightGap >= RoomForCraft && rightGap >= leftGap) return { rect: { left: row.left + row.width, top: row.top, width: rightGap, height: row.height }, anchor: { x: 0.5, y: 0.5 } }
  if (leftGap >= RoomForCraft) return { rect: { left: view.left, top: row.top, width: leftGap, height: row.height }, anchor: { x: 0.5, y: 0.5 } }
  return { rect: view, anchor: { x: 0.5, y: 0.5 } }
}

export function useSceneStage(root: RefObject<HTMLElement | null>, mode: SceneMode, loadout: Loadout, active: ReadonlySet<string> | undefined, layoutKey: string) {
  const scene = FlightScene.shared
  const activeKey = active ? [...active].sort().join(',') : ''

  useEffect(() => {
    scene.show(mode)
  }, [mode])

  useEffect(() => () => scene.show(SceneMode.Hidden), [])

  useEffect(() => {
    scene.setLoadout(loadout, active)
  }, [loadout, activeKey])

  useLayoutEffect(() => {
    const element = root.current
    if (!element) return
    const update = (instant: boolean) => {
      const found = measure(element, mode)
      if (found) scene.setStage(found.rect, found.anchor, instant)
    }
    update(false)
    const frame = requestAnimationFrame(() => update(false))
    const observer = new ResizeObserver(() => update(true))
    observer.observe(element)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [mode, layoutKey])
}
