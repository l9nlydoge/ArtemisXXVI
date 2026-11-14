interface ToggleFieldProps {
  label: string
  checked: boolean
  disabled?: boolean
  highlighted?: boolean
  onChange(checked: boolean): void
}

export function ToggleField({ label, checked, disabled, highlighted, onChange }: ToggleFieldProps) {
  return (
    <label className={`Field ToggleField ${highlighted ? 'IsHighlighted' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className="FieldLabel">{label}</span>
    </label>
  )
}
