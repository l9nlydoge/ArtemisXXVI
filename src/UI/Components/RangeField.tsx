interface RangeFieldProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit?: string
  disabled?: boolean
  highlighted?: boolean
  onChange(value: number): void
}

export function RangeField({ label, value, min, max, step, unit, disabled, highlighted, onChange }: RangeFieldProps) {
  return (
    <label className={`Field ${highlighted ? 'IsHighlighted' : ''}`}>
      <span className="FieldLabel">
        {label}
        <output className="Numeric">{value}{unit ? ` ${unit}` : ''}</output>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}
