'use client';

import { useMemo } from 'react';
import { isKnownVariable } from '@/domain/services/FormulaVariables';

interface FormulaDisplayProps {
  formula: string;
  className?: string;
}

const BUILTIN_FUNCTIONS = new Set([
  'floor', 'round', 'min', 'max',
  'truncate1', 'truncate10', 'clamp', 'taxLookup',
]);

interface FormulaToken {
  type: 'variable' | 'function' | 'number' | 'operator' | 'paren' | 'other';
  value: string;
}

function tokenizeForDisplay(formula: string): FormulaToken[] {
  const tokens: FormulaToken[] = [];
  let i = 0;

  while (i < formula.length) {
    const ch = formula[i];

    if (/\s/.test(ch)) {
      tokens.push({ type: 'other', value: ch });
      i++;
      continue;
    }

    if (/[0-9]/.test(ch)) {
      const start = i;
      while (i < formula.length && /[0-9.]/.test(formula[i])) i++;
      tokens.push({ type: 'number', value: formula.slice(start, i) });
      continue;
    }

    if (/[a-zA-Z가-힣_]/.test(ch)) {
      const start = i;
      while (i < formula.length && /[a-zA-Z0-9가-힣_]/.test(formula[i])) i++;
      const name = formula.slice(start, i);
      if (BUILTIN_FUNCTIONS.has(name)) {
        tokens.push({ type: 'function', value: name });
      } else if (isKnownVariable(name)) {
        tokens.push({ type: 'variable', value: name });
      } else {
        tokens.push({ type: 'other', value: name });
      }
      continue;
    }

    if ('+-*/'.includes(ch)) {
      tokens.push({ type: 'operator', value: ch });
      i++;
      continue;
    }

    if ('(),'.includes(ch)) {
      tokens.push({ type: 'paren', value: ch });
      i++;
      continue;
    }

    tokens.push({ type: 'other', value: ch });
    i++;
  }

  return tokens;
}

export function FormulaDisplay({ formula, className = '' }: FormulaDisplayProps) {
  const tokens = useMemo(() => tokenizeForDisplay(formula), [formula]);

  return (
    <span className={`inline-flex flex-wrap items-center gap-0.5 font-mono text-xs ${className}`}>
      {tokens.map((token, idx) => {
        switch (token.type) {
          case 'variable':
            return (
              <span
                key={idx}
                className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700"
              >
                {token.value}
              </span>
            );
          case 'function':
            return (
              <span
                key={idx}
                className="rounded bg-purple-100 px-1 py-0.5 text-purple-700 font-semibold"
              >
                {token.value}
              </span>
            );
          case 'number':
            return (
              <span key={idx} className="text-amber-700">
                {token.value}
              </span>
            );
          case 'operator':
            return (
              <span key={idx} className="mx-0.5 font-bold text-gray-600">
                {token.value}
              </span>
            );
          default:
            return (
              <span key={idx} className="text-gray-500">
                {token.value}
              </span>
            );
        }
      })}
    </span>
  );
}
