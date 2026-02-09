'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button, Input } from '@/components/ui';

export interface TierData {
  serviceMonthFrom: number;
  serviceMonthTo: number;
  accrualDays: number;
  validMonths?: number;
  sortOrder: number;
}

interface AccrualRuleTierEditorProps {
  tiers: TierData[];
  onChange: (tiers: TierData[]) => void;
  accrualUnit: string;
}

export function AccrualRuleTierEditor({ tiers, onChange, accrualUnit }: AccrualRuleTierEditorProps) {
  const addTier = () => {
    const lastTier = tiers[tiers.length - 1];
    const newFrom = lastTier ? lastTier.serviceMonthTo + 1 : 1;
    onChange([
      ...tiers,
      {
        serviceMonthFrom: newFrom,
        serviceMonthTo: newFrom,
        accrualDays: 1,
        validMonths: accrualUnit === 'MONTHLY' ? 12 : undefined,
        sortOrder: tiers.length + 1,
      },
    ]);
  };

  const removeTier = (index: number) => {
    onChange(tiers.filter((_, i) => i !== index).map((t, i) => ({ ...t, sortOrder: i + 1 })));
  };

  const updateTier = (index: number, field: keyof TierData, value: number | undefined) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-700">발생 단계 ({tiers.length}개)</p>
        <Button size="sm" variant="ghost" onClick={addTier}>
          <Plus className="h-3.5 w-3.5" />
          단계 추가
        </Button>
      </div>

      {tiers.length === 0 ? (
        <p className="py-4 text-center text-xs text-gray-400">단계를 추가하세요</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  {accrualUnit === 'MONTHLY' ? '근속 월수 (from)' : '근속 개월 (from)'}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                  {accrualUnit === 'MONTHLY' ? '근속 월수 (to)' : '근속 개월 (to)'}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">발생 일수</th>
                {accrualUnit === 'MONTHLY' && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">유효 개월</th>
                )}
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">삭제</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-3 py-1.5 text-xs text-gray-400">{i + 1}</td>
                  <td className="px-3 py-1.5">
                    <Input
                      type="number"
                      value={String(tier.serviceMonthFrom)}
                      onChange={(e) => updateTier(i, 'serviceMonthFrom', Number(e.target.value))}
                      className="w-20"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      type="number"
                      value={String(tier.serviceMonthTo)}
                      onChange={(e) => updateTier(i, 'serviceMonthTo', Number(e.target.value))}
                      className="w-20"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <Input
                      type="number"
                      value={String(tier.accrualDays)}
                      onChange={(e) => updateTier(i, 'accrualDays', Number(e.target.value))}
                      className="w-20"
                    />
                  </td>
                  {accrualUnit === 'MONTHLY' && (
                    <td className="px-3 py-1.5">
                      <Input
                        type="number"
                        value={String(tier.validMonths ?? '')}
                        onChange={(e) => updateTier(i, 'validMonths', e.target.value ? Number(e.target.value) : undefined)}
                        className="w-20"
                        placeholder="-"
                      />
                    </td>
                  )}
                  <td className="px-3 py-1.5 text-center">
                    <button
                      onClick={() => removeTier(i)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
