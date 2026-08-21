interface Props {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'date'
  placeholder?: string
  hint?: string
}

export function TextField({ id, label, value, onChange, type = 'text', placeholder, hint }: Props) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {hint && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
    </div>
  )
}
