'use client';

import { useCallback, type InputHTMLAttributes } from 'react';
import { Input } from './Input';
import { formatPhoneNumber, stripPhoneNumber } from '@/lib/phone';

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  label?: string;
  error?: string;
  value: string;
  onChange: (digits: string) => void;
}

export function PhoneInput({ value, onChange, ...props }: PhoneInputProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = stripPhoneNumber(e.target.value).slice(0, 11);
      onChange(digits);
    },
    [onChange],
  );

  return (
    <Input
      {...props}
      type="tel"
      inputMode="numeric"
      value={formatPhoneNumber(value)}
      onChange={handleChange}
    />
  );
}
