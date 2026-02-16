'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  getVariablesByCategory,
  getCategoryLabel,
  type VariableCategory,
  type FormulaVariable,
} from '@/domain/services/FormulaVariables';

interface VariablePanelProps {
  type: 'ALLOWANCE' | 'DEDUCTION';
  onInsert: (variable: string) => void;
}

export function VariablePanel({ type, onInsert }: VariablePanelProps) {
  const grouped = useMemo(() => getVariablesByCategory(type), [type]);
  const categories = useMemo(() => Array.from(grouped.entries()), [grouped]);

  return (
    <div className="space-y-1">
      <div className="px-2 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        변수
      </div>
      {categories.map(([category, variables]) => (
        <CategoryGroup
          key={category}
          category={category}
          variables={variables}
          onInsert={onInsert}
        />
      ))}
    </div>
  );
}

function CategoryGroup({
  category,
  variables,
  onInsert,
}: {
  category: VariableCategory;
  variables: FormulaVariable[];
  onInsert: (variable: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-1 rounded px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {getCategoryLabel(category)}
      </button>
      {expanded && (
        <div className="ml-2 flex flex-wrap gap-1 px-2 pb-1">
          {variables.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => onInsert(v.key)}
              title={`${v.label} (${v.unit})`}
              className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-100 transition-colors"
            >
              {v.key}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
