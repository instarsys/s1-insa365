'use client';

import { useState, useEffect, useMemo } from 'react';
import { Save, Plus, Download, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { stripPhoneNumber } from '@/lib/phone';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { AddressSearchInput } from '@/components/address/AddressSearchInput';
import { apiGet, apiPut, apiPost } from '@/lib/api';
import { useCompanyHolidays, useCompanyHolidayMutations } from '@/hooks';

interface CompanySettings {
  name: string;
  businessNumber: string;
  representativeName: string;
  address: string;
  phone: string;
  email: string;
  payDay: number;
  prorationMethod: string;
  gpsEnforcementMode: string;
  logoUrl: string | null;
  sealUrl: string | null;
}

const PAY_DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}일`,
}));

const PRORATION_OPTIONS = [
  { value: 'CALENDAR_DAY', label: '역일 기준' },
  { value: 'WORKING_DAY', label: '근무일 기준' },
];

const GPS_ENFORCEMENT_OPTIONS = [
  { value: 'OFF', label: '사용 안 함' },
  { value: 'WARN', label: '경고 (반경 밖 출퇴근 허용, 경고 표시)' },
  { value: 'BLOCK', label: '차단 (반경 밖 출퇴근 불가)' },
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
    gpsEnforcementMode: 'OFF',
    logoUrl: null,
    sealUrl: null,
  });

  useEffect(() => {
    apiGet<CompanySettings>('/api/settings/company')
      .then((data) => setForm({ ...data, phone: stripPhoneNumber(data.phone || '') }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toast = useToast();

  function updateField(field: keyof CompanySettings, value: string | number | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleImageUpload(type: 'logo' | 'seal', file: File) {
    try {
      const { uploadUrl, imageUrl } = await apiPost<{ uploadUrl: string; imageUrl: string }>(
        '/api/upload/presigned-url',
        { category: type, contentType: file.type },
      );
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      const field = type === 'logo' ? 'logoUrl' : 'sealUrl';
      await apiPut('/api/settings/company', { [field]: imageUrl });
      updateField(field as keyof CompanySettings, imageUrl);
      toast.success(type === 'logo' ? '로고가 업로드되었습니다.' : '직인이 업로드되었습니다.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '업로드에 실패했습니다.');
    }
  }

  async function handleImageDelete(type: 'logo' | 'seal') {
    try {
      const field = type === 'logo' ? 'logoUrl' : 'sealUrl';
      await apiPut('/api/settings/company', { [field]: null });
      updateField(field as keyof CompanySettings, null);
      toast.success(type === 'logo' ? '로고가 삭제되었습니다.' : '직인이 삭제되었습니다.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    }
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
          <CardTitle>회사 로고 / 직인</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex items-start gap-12">
            <ImageUpload
              imageUrl={form.logoUrl}
              onUpload={(file) => handleImageUpload('logo', file)}
              onDelete={() => handleImageDelete('logo')}
              shape="square"
              size={120}
              label="회사 로고"
            />
            <ImageUpload
              imageUrl={form.sealUrl}
              onUpload={(file) => handleImageUpload('seal', file)}
              onDelete={() => handleImageDelete('seal')}
              shape="square"
              size={120}
              label="회사 직인"
            />
          </div>
          <p className="mt-3 text-xs text-gray-500">
            로고와 직인은 급여명세서, 문서 등에 사용됩니다. 권장 크기: 200×200px 이상, PNG/JPG 형식
          </p>
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="상호"
              value={form.name}
              readOnly
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <Input
              label="사업자번호"
              value={form.businessNumber}
              readOnly
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <Input
              label="대표자명"
              value={form.representativeName}
              onChange={(e) => updateField('representativeName', e.target.value)}
            />
            <PhoneInput
              label="전화번호"
              value={form.phone}
              onChange={(digits) => updateField('phone', digits)}
            />
            <Input
              label="이메일"
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
            <div className="sm:col-span-2">
              <AddressSearchInput
                label="주소"
                value={form.address}
                onChange={(addr) => updateField('address', addr)}
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

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>GPS 출퇴근 정책</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="GPS 검증 모드"
              options={GPS_ENFORCEMENT_OPTIONS}
              value={form.gpsEnforcementMode}
              onChange={(v) => updateField('gpsEnforcementMode', v)}
            />
            <div />
            <p className="text-xs text-gray-500 sm:col-span-2">
              <strong>사용 안 함</strong>: GPS 좌표만 기록하며 반경 검증을 하지 않습니다.<br />
              <strong>경고</strong>: 반경 밖 출퇴근 시 경고를 표시하지만 출퇴근은 허용합니다.<br />
              <strong>차단</strong>: 반경 밖에서는 출퇴근이 불가합니다.
            </p>
            <p className="text-xs text-gray-500 sm:col-span-2">
              근무지별 반경 설정은 설정 &gt; 근무지 관리에서 할 수 있습니다.
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

      {/* 휴일 설정 */}
      <HolidaySection />
    </div>
  );
}

// ─── Holiday Section ─────────────────────────────────────────
function HolidaySection() {
  const toast = useToast();
  const now = new Date();
  const [holidayYear, setHolidayYear] = useState(now.getFullYear());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [importing, setImporting] = useState(false);

  const { holidays, isLoading: holidaysLoading, mutate: mutateHolidays } = useCompanyHolidays(holidayYear);
  const mutations = useCompanyHolidayMutations();

  const yearOptions = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => {
      const y = now.getFullYear() - 1 + i;
      return { value: String(y), label: `${y}년` };
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  const nationalCount = holidays.filter((h) => h.type === 'NATIONAL').length;
  const companyCount = holidays.filter((h) => h.type === 'COMPANY').length;

  async function handleImportNational() {
    setImporting(true);
    try {
      await mutations.importNational(holidayYear);
      await mutateHolidays();
      toast.success(`${holidayYear}년 법정 공휴일을 불러왔습니다.`);
    } catch {
      toast.error('공휴일 불러오기에 실패했습니다.');
    } finally {
      setImporting(false);
    }
  }

  async function handleAddHoliday() {
    if (!newHolidayDate || !newHolidayName) return;
    try {
      await mutations.create({ date: newHolidayDate, name: newHolidayName, type: 'COMPANY' });
      await mutateHolidays();
      setShowAddModal(false);
      setNewHolidayDate('');
      setNewHolidayName('');
      toast.success('회사 휴일이 추가되었습니다.');
    } catch {
      toast.error('휴일 추가에 실패했습니다.');
    }
  }

  async function handleDelete(id: string) {
    try {
      await mutations.deleteHoliday(id);
      await mutateHolidays();
    } catch {
      toast.error('휴일 삭제에 실패했습니다.');
    }
  }

  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>휴일 설정</CardTitle>
          <div className="flex items-center gap-2">
            <Select
              options={yearOptions}
              value={String(holidayYear)}
              onChange={(v) => setHolidayYear(Number(v))}
              wrapperClassName="w-28"
            />
            <Button variant="secondary" onClick={handleImportNational} disabled={importing}>
              {importing ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
              한국 공휴일 불러오기
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4" />
              회사 휴일 추가
            </Button>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {holidaysLoading ? (
            <Spinner text="휴일 목록 로딩중..." className="py-8" />
          ) : holidays.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              등록된 휴일이 없습니다. &quot;한국 공휴일 불러오기&quot;를 눌러 법정 공휴일을 추가하세요.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-600">휴일명</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">날짜</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">유형</th>
                    <th className="px-4 py-3 text-center font-medium text-gray-600">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {holidays.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{h.name}</td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {new Date(h.date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' })}
                      </td>
                      <td className="px-4 py-2.5">
                        {h.type === 'NATIONAL' ? (
                          <Badge variant="info">법정</Badge>
                        ) : (
                          <Badge variant="warning">회사</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => handleDelete(h.id)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t bg-gray-50 px-4 py-3 text-xs text-gray-500">
            법정 공휴일 {nationalCount}일 + 회사 지정 {companyCount}일 = 총 {nationalCount + companyCount}일
          </div>
        </CardBody>
      </Card>

      {/* Add Holiday Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="회사 휴일 추가"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>취소</Button>
            <Button onClick={handleAddHoliday} disabled={!newHolidayDate || !newHolidayName}>추가</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="휴일명"
            placeholder="예: 창립기념일"
            value={newHolidayName}
            onChange={(e) => setNewHolidayName(e.target.value)}
          />
          <Input
            label="날짜"
            type="date"
            value={newHolidayDate}
            onChange={(e) => setNewHolidayDate(e.target.value)}
          />
        </div>
      </Modal>
    </>
  );
}
