'use client';

import { useState, useMemo } from 'react';
import { FileJson, Download } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const currentYear = new Date().getFullYear();

function generateYearOptions() {
  return [currentYear - 1, currentYear, currentYear + 1].map((y) => ({
    value: String(y),
    label: `${y}년`,
  }));
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}월`,
}));

export default function TaxReportsPage() {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const yearOptions = useMemo(() => generateYearOptions(), []);

  function handleDownload() {
    const data = {
      reportType: '원천징수이행상황신고서',
      year,
      month,
      status: 'PLACEHOLDER',
      message: 'Phase 1.5에서 실제 데이터가 제공됩니다.',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `원천징수이행상황신고서_${year}_${month}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader title="신고 데이터" subtitle="세무 신고용 데이터를 조회합니다." />

      <Card className="mb-6">
        <CardBody>
          <div className="flex items-end gap-4">
            <Select
              label="연도"
              options={yearOptions}
              value={String(year)}
              onChange={(v) => setYear(Number(v))}
              className="w-32"
            />
            <Select
              label="월"
              options={MONTH_OPTIONS}
              value={String(month)}
              onChange={(v) => setMonth(Number(v))}
              className="w-28"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>원천징수이행상황신고서</CardTitle>
          <Badge variant="warning">Phase 1.5</Badge>
        </CardHeader>
        <CardBody className="text-center">
          <FileJson className="mx-auto h-16 w-16 text-gray-300" />
          <h3 className="mt-4 font-semibold text-gray-700">신고 데이터 생성</h3>
          <p className="mt-2 text-sm text-gray-500">
            원천징수이행상황신고서 데이터는 Phase 1.5에서 제공됩니다.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            현재는 테스트용 JSON 다운로드만 지원합니다.
          </p>
          <Button variant="secondary" className="mt-4" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            JSON 다운로드
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
