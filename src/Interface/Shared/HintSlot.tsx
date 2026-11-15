import { useEffect, useState } from 'react'
import { useWording } from '../../I18n/UseTranslator'
import { useGameStore } from '../../State/GameStore'
import { type Hint, HintBook } from '../../State/HintBook'

export interface HintCandidate {
  hint: Hint
  when?: boolean
}

export type HintPointer = 'Up' | 'Down' | 'Left' | 'None'

interface HintSlotProps {
  candidates: readonly HintCandidate[]
  pointer?: HintPointer
  place?: string
  onShow?: (shown: boolean) => void
}

export function HintSlot({ candidates, pointer = 'None', place = '', onShow }: HintSlotProps) {
  const wording = useWording()
  const profile = useGameStore((state) => state.profile)
  const markHint = useGameStore((state) => state.markHint)
  const [open, setOpen] = useState<Hint | undefined>(undefined)
  const due = (candidate: HintCandidate) => candidate.when !== false
  const next = open ? undefined : candidates.find((candidate) => due(candidate) && HintBook.wants(candidate.hint, profile))?.hint
  const stillDue = open !== undefined && candidates.some((candidate) => candidate.hint === open && due(candidate))

  useEffect(() => {
    if (!next) return
    setOpen(next)
    markHint(next)
  }, [next, markHint])

  useEffect(() => {
    if (open && !stillDue) setOpen(undefined)
  }, [open, stillDue])

  useEffect(() => {
    onShow?.(open !== undefined)
  }, [open, onShow])

  useEffect(() => {
    if (!open) return
    const onKey = (pressed: KeyboardEvent) => {
      const focus = document.activeElement
      const elsewhere = focus instanceof HTMLElement && focus !== document.body && !focus.closest('.HintCallout')
      if (pressed.key === 'Escape' || (pressed.key === 'Enter' && !elsewhere)) {
        pressed.preventDefault()
        pressed.stopImmediatePropagation()
        setOpen(undefined)
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open])

  if (!open) return null
  return (
    <aside className={`HintCallout Point${pointer} ${place}`} role="note" aria-live="polite" data-hint={open}>
      <p>{wording.t(HintBook.textKey(open))}</p>
      <button type="button" onClick={() => setOpen(undefined)}>{wording.t('Hint.GotIt')}</button>
    </aside>
  )
}
