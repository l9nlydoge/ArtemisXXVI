import { useEffect, useMemo, useRef, useState } from 'react'
import type { Loadout } from '../../Engine/Spacecraft/Loadout'
import { MotionPreference } from '../Shared/MotionPreference'
import { SpacecraftBlueprint } from './SpacecraftBlueprint'
import { SpacecraftPainter } from './SpacecraftPainter'

const NoKeys: ReadonlySet<string> = new Set()
const IdleMs = 700

interface SpacecraftSpriteProps {
  loadout: Loadout
  active?: ReadonlySet<string>
  maxScale: number
  label: string
}

export function SpacecraftSprite({ loadout, active = NoKeys, maxScale, label }: SpacecraftSpriteProps) {
  const holder = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [frame, setFrame] = useState(0)
  const [room, setRoom] = useState({ width: 0, height: 0 })
  const activeKey = [...active].sort().join(',')

  const frames = useMemo(() => {
    const painter = new SpacecraftPainter(new SpacecraftBlueprint(loadout))
    const painted = [painter.paint(0, active), painter.paint(1, active)]
    const crop = SpacecraftPainter.crop(painted)
    return { painted, crop }
  }, [loadout, activeKey])

  useEffect(() => {
    if (MotionPreference.reduced) return
    const timer = window.setInterval(() => setFrame((current) => 1 - current), IdleMs)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const element = holder.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setRoom({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const { crop } = frames
  const ratio = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
  const fit = Math.floor(Math.min((room.width * ratio) / crop.w, (room.height * ratio) / crop.h))
  const scale = Math.max(1, Math.min(Math.round(maxScale * ratio), fit))

  useEffect(() => {
    const target = canvas.current
    if (!target) return
    const context = target.getContext('2d')
    if (!context) return
    const image = frames.painted[frame].toImageData()
    context.clearRect(0, 0, crop.w, crop.h)
    context.putImageData(image, -crop.x, -crop.y, crop.x, crop.y, crop.w, crop.h)
  }, [frames, frame, crop])

  return (
    <div ref={holder} className="SpacecraftSprite">
      <canvas
        ref={canvas}
        width={crop.w}
        height={crop.h}
        role="img"
        aria-label={label}
        style={{ width: `${(crop.w * scale) / ratio}px`, height: `${(crop.h * scale) / ratio}px` }}
      />
    </div>
  )
}
