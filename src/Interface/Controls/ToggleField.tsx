interface ToggleFieldProps {
  label: string
  hint?: string
  checked: boolean
  disabled?: boolean
  highlighted?: boolean
  onChange(checked: boolean): void
}

export function ToggleField({ label, hint, checked, disabled, highlighted, onChange }: ToggleFieldProps) {
  return (
    <label className={`Control ToggleField ${highlighted ? 'IsHighlighted' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className="ControlLabel">{label}</span>
      {hint && <span className="ControlHint">{hint}</span>}
    </label>
  )
}
