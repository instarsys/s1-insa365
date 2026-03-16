'use client';

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { apiGet, apiPut } from '@/lib/api';

interface CompanySettings {
  name: string;
  businessNumber: string;
  representativeName: string;
  address: string;
  phone: string;
  email: string;
  payDay: number;
  prorationMethod: string;
}

const PAY_DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}일`,
}));

const PRORATION_OPTIONS = [
  { value: 'CALENDAR_DAY', label: '역일 기준' },
  { value: 'WORKING_DAY', label: '근무일 기준' },
];

export default function CompanySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CompanySettings>({
    name: '',
    businessNumber: '',
    representativeName: '',
    address: '',
    phone: '',
    email: '',
    payDay: 25,
    prorationMethod: 'CALENDAR_DAY',
  });

  useEffect(() => {
    apiGet<CompanySettings>('/api/settings/company')
      .then((data) => setForm(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function updateField(field: keyof CompanySettings, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiPut('/api/settings/company', form);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner text="로딩중..." className="py-12" />;

  return (
    <div>
      <PageHeader title="회사 정보" subtitle="회사 기본 정보를 설정합니다." />

      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="상호"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
            <Input
              label="사업자번호"
              value={form.businessNumber}
              onChange={(e) => updateField('businessNumber', e.target.value)}
              placeholder="000-00-00000"
            />
            <Input
              label="대표자명"
              value={form.representativeName}
              onChange={(e) => updateField('representativeName', e.target.value)}
            />
            <Input
              label="전화번호"
              value={form.phone}
              onChange={(e) => updateField('phone', e.target.value)}
            />
            <Input
              label="이메일"
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
            <div className="sm:col-span-2">
              <Input
                label="주소"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>급여 설정</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="급여일"
              options={PAY_DAY_OPTIONS}
              value={String(form.payDay)}
              onChange={(v) => updateField('payDay', Number(v))}
            />
            <Select
              label="일할계산 방법"
              options={PRORATION_OPTIONS}
              value={form.prorationMethod}
              onChange={(v) => updateField('prorationMethod', v)}
            />
            <p className="text-xs text-gray-500 sm:col-span-2">
              역일 기준: 해당 월 총 일수(토·일·공휴일 포함) 기준으로 계산합니다.<br />
              근무일 기준: 해당 월 평일 수(토·일·공휴일 제외) 기준으로 계산합니다.
            </p>
            <p className="text-xs text-gray-500 sm:col-span-2">
              지각/조퇴 유예시간, 야간근로, 소정근로시간 등은 설정 &gt; 근무 정책에서 정책별로 관리합니다.
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
          저장
        </Button>
      </div>
    </div>
  );
}
