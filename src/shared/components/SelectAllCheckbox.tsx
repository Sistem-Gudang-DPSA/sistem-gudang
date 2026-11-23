"use client";

import { useEffect, useRef } from 'react';

type Props = {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
};

// Checkbox header: React belum konsisten menerima `indeterminate` sebagai prop, jadi di-set lewat ref.
export default function SelectAllCheckbox({ checked, indeterminate = false, onChange, ariaLabel, disabled, className }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !checked && indeterminate;
  }, [checked, indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={ariaLabel}
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      className={className}
    />
  );
}
