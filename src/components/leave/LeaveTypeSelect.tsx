'use client';

import { Select } from '@/components/ui';
import { useLeaveTypeConfigs } from '@/hooks';

interface LeaveTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  showAll?: boolean;
  wrapperClassName?: string;
}

export function LeaveTypeSelect({ value, onChange, label, showAll = true, wrapperClassName }: LeaveTypeSelectProps) {
  const { typeConfigs, isLoading } = useLeaveTypeConfigs();

  const options = [
    ...(showAll ? [{ value: '', label: '전체 유형' }] : []),
    ...typeConfigs
      .filter((t) => t.isActive)
      .map((t) => ({ value: t.id, label: `${t.name}${t.leaveGroup ? ` (${t.leaveGroup.name})` : ''}` })),
  ];

  if (isLoading) {
    return <Select options={[{ value: '', label: '로딩중...' }]} value="" onChange={() => {}} label={label} wrapperClassName={wrapperClassName} />;
  }

  return (
    <Select
      options={options}
      value={value}
      onChange={onChange}
      label={label}
      wrapperClassName={wrapperClassName}
    />
  );
}
