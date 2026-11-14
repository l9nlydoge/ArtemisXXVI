import { useMemo } from 'react'
import type { ResolvedDesign } from '../../Engine/Design/ResolvedDesign'
import { AntennaShape, InstrumentShape, SpacecraftBlueprint, type Box, type InstrumentPart, type WingPart } from './SpacecraftBlueprint'

function Wing({ wing, rollOut }: { wing: WingPart; rollOut: boolean }) {
  const { x, y, w, h } = wing.box
  const rootX = wing.side === 1 ? x : x + w
  const dividers = Array.from({ length: wing.panels - 1 }, (_, index) => x + (w * (index + 1)) / wing.panels)
  return (
    <g className={`Wing ${rollOut ? 'IsRollOut' : ''}`}>
      <line className="Strut" x1={0} y1={0} x2={rootX} y2={0} />
      <rect className="Cells" x={x} y={y} width={w} height={h} rx={rollOut ? h * 0.08 : 0} />
      {!rollOut && dividers.map((divider) => <line key={divider} className="CellLine" x1={divider} y1={y} x2={divider} y2={y + h} />)}
      {!rollOut && <line className="CellLine" x1={x} y1={0} x2={x + w} y2={0} />}
      {rollOut && <circle className="Drum" cx={rootX} cy={0} r={h * 0.14} />}
    </g>
  )
}

function Instrument({ part }: { part: InstrumentPart }) {
  const { x, y, w, h } = part.box
  switch (part.shape) {
    case InstrumentShape.Telescope:
      return (
        <g className="Instrument">
          <rect x={x + w * 0.12} y={y} width={w * 0.76} height={h * 0.82} />
          <path d={`M ${x} ${y + h} L ${x + w * 0.12} ${y + h * 0.82} L ${x + w * 0.88} ${y + h * 0.82} L ${x + w} ${y + h} Z`} />
          <line x1={x + w * 0.12} y1={y + h * 0.3} x2={x + w * 0.88} y2={y + h * 0.3} />
        </g>
      )
    case InstrumentShape.Radiator:
      return (
        <g className="Instrument">
          <rect x={x + w * 0.1} y={y} width={w * 0.8} height={h} />
          <rect className="Fin" x={x} y={y + h * 0.15} width={w * 0.1} height={h * 0.7} />
          <rect className="Aperture" x={x + w * 0.35} y={y + h * 0.78} width={w * 0.3} height={h * 0.22} />
        </g>
      )
    case InstrumentShape.Dish:
      return (
        <g className="Instrument">
          <line x1={x + w / 2} y1={y} x2={x + w / 2} y2={y + h * 0.45} />
          <path d={`M ${x} ${y + h} Q ${x + w / 2} ${y + h * 0.1} ${x + w} ${y + h} Z`} />
        </g>
      )
    case InstrumentShape.Panel:
      return (
        <g className="Instrument">
          <line x1={0} y1={y - h * 0.6} x2={0} y2={y} />
          <rect x={x} y={y} width={w} height={h} />
          {Array.from({ length: 7 }, (_, index) => x + (w * (index + 1)) / 8).map((divider) => (
            <line key={divider} x1={divider} y1={y} x2={divider} y2={y + h} />
          ))}
        </g>
      )
  }
}

function Antenna({ shape, box }: { shape: AntennaShape; box: Box }) {
  const { x, y, w, h } = box
  const base = y + h
  switch (shape) {
    case AntennaShape.Whip:
      return (
        <g className="Antenna">
          <line x1={x + w * 0.3} y1={base} x2={x} y2={y} />
          <line x1={x + w * 0.7} y1={base} x2={x + w} y2={y} />
        </g>
      )
    case AntennaShape.Patch:
      return <rect className="Antenna" x={x} y={base - h * 0.25} width={w} height={h * 0.25} />
    case AntennaShape.Dish:
      return (
        <g className="Antenna">
          <line x1={x + w / 2} y1={base} x2={x + w / 2} y2={y + h * 0.55} />
          <path d={`M ${x} ${y + h * 0.1} Q ${x + w / 2} ${y + h} ${x + w} ${y + h * 0.1} Z`} />
          <line x1={x + w / 2} y1={y + h * 0.55} x2={x + w / 2} y2={y} />
        </g>
      )
    case AntennaShape.Laser:
      return (
        <g className="Antenna">
          <rect x={x + w * 0.3} y={y + h * 0.4} width={w * 0.4} height={h * 0.6} />
          <line className="Beam" x1={x + w / 2} y1={y + h * 0.4} x2={x + w / 2 - w * 2} y2={y - h * 3} />
        </g>
      )
  }
}

interface SpacecraftDrawingProps {
  design: ResolvedDesign
  label: string
  showScale?: boolean
}

export function SpacecraftDrawing({ design, label, showScale = true }: SpacecraftDrawingProps) {
  const blueprint = useMemo(() => new SpacecraftBlueprint(design), [design])
  const { body, bounds } = blueprint
  const barLength = blueprint.scaleBarM
  const barY = bounds.y + bounds.h - bounds.h * 0.07
  const barX = bounds.x + bounds.w * 0.05
  const tick = bounds.h * 0.015
  return (
    <svg className={`SpacecraftDrawing ${blueprint.payloadFits ? '' : 'IsOverloaded'}`} viewBox={`${bounds.x} ${bounds.y} ${bounds.w} ${bounds.h}`} role="img" aria-label={label}>
      {blueprint.wings.map((wing) => <Wing key={wing.side} wing={wing} rollOut={blueprint.rollOut} />)}
      <Antenna shape={blueprint.antenna.shape} box={blueprint.antenna.box} />
      {blueprint.instruments.map((part) => <Instrument key={part.id} part={part} />)}
      {blueprint.shielded && <rect className="Shield" x={body.x - body.w * 0.05} y={body.y - body.w * 0.05} width={body.w * 1.1} height={body.h + body.w * 0.1} />}
      <rect className="Body" x={body.x} y={body.y} width={body.w} height={body.h} />
      <line className="Seam" x1={body.x} y1={body.y + body.h * 0.34} x2={body.x + body.w} y2={body.y + body.h * 0.34} />
      <line className="Seam" x1={body.x} y1={body.y + body.h * 0.7} x2={body.x + body.w} y2={body.y + body.h * 0.7} />
      <line className="Seam" x1={body.x + body.w * 0.5} y1={body.y + body.h * 0.34} x2={body.x + body.w * 0.5} y2={body.y + body.h * 0.7} />
      {showScale && (
        <g className="ScaleBar">
          <line x1={barX} y1={barY} x2={barX + barLength} y2={barY} />
          <line x1={barX} y1={barY - tick} x2={barX} y2={barY + tick} />
          <line x1={barX + barLength} y1={barY - tick} x2={barX + barLength} y2={barY + tick} />
          <text x={barX + barLength + bounds.w * 0.015} y={barY} dominantBaseline="middle" fontSize={Math.max(bounds.h, bounds.w * 0.5) * 0.045}>
            {barLength >= 1 ? `${barLength} m` : `${barLength * 100} cm`}
          </text>
        </g>
      )}
    </svg>
  )
}
