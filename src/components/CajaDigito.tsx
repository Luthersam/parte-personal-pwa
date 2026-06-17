import React from 'react';

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  max?: number;
}

export function CajaDigito({ label, value, onChange, max }: Props) {
  const isInvalid = max !== undefined && value > max && max > 0;

  return (
    <div className="caja-digito">
      <label className="caja-digito__label">{label}</label>
      <input
        type="number"
        min="0"
        max={max || undefined}
        value={value || ''}
        onChange={(e) => onChange(Math.max(0, parseInt(e.target.value) || 0))}
        className={`caja-digito__input ${isInvalid ? 'caja-digito__input--invalid' : ''}`}
      />
    </div>
  );
}
