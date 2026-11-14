interface RangeFieldProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  hint?: string
  disabled?: boolean
  highlighted?: boolean
  onChange(value: number): void
}

export function RangeField({ label, value, min, max, step, unit, hint, disabled, highlighted, onChange }: RangeFieldProps) {
  return (
    <label className={`Control RangeField ${highlighted ? 'IsHighlighted' : ''}`}>
      <span className="ControlLabel">{label}</span>
      <output>{value}{unit ? ` ${unit}` : ''}</output>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} />
      {hint && <span className="ControlHint">{hint}</span>}
    </label>
  )
}
