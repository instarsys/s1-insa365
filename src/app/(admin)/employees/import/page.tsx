'use client';

import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from 'react';
import { PageHeader } from '@/components/layout';
import {
  Button, Card, CardBody, Tabs, Badge, useToast,
} from '@/components/ui';
import { Upload, FileSpreadsheet, X, AlertTriangle, Download, CheckCircle } from 'lucide-react';
import { useEmployeeImport, type ParsedRow } from '@/hooks/useEmployeeImport';

type ImportType = 'create' | 'update' | 'wages';
type Step = 'template' | 'upload' | 'preview';

const IMPORT_TABS = [
  { key: 'create', label: '신규 직원 추가' },
  { key: 'update', label: '기존 직원 수정' },
  { key: 'wages', label: '근로정보 업로드' },
];

const TYPE_DESCRIPTION: Record<ImportType, { title: string; desc: string }> = {
  create: {
    title: '신규 직원 일괄 등록',
    desc: '템플릿을 다운로드하여 직원 정보를 입력한 후 업로드하면 일괄 등록됩니다. 기본 비밀번호는 changeme123! 로 설정됩니다.',
  },
  update: {
    title: '기존 직원 정보 수정',
    desc: '사번을 기준으로 기존 직원의 이름, 이메일, 연락처, 부서, 직급을 일괄 수정합니다.',
  },
  wages: {
    title: '근로정보 업로드',
    desc: '사번을 기준으로 기본급, 보험모드를 일괄 수정합니다.',
  },
};

export default function EmployeeImportPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<ImportType>('create');
  const [step, setStep] = useState<Step>('template');
  const [isDragOver, setIsDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const {
    parseResult,
    isParsing,
    isConfirming,
    downloadTemplate,
    parseFile,
    confirmImport,
    reset,
  } = useEmployeeImport();

  const handleTabChange = useCallback((key: string) => {
    setImportType(key as ImportType);
    setStep('template');
    setFile(null);
    reset();
  }, [reset]);

  const handleFile = useCallback(async (f: File) => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (!validTypes.includes(f.type) && !f.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast.error('CSV 또는 Excel 파일만 업로드 가능합니다.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('파일 크기가 10MB를 초과합니다.');
      return;
    }
    setFile(f);
    try {
      await parseFile(f, importType);
      setStep('preview');
    } catch {
      toast.error('파일 파싱에 실패했습니다.');
    }
  }, [importType, parseFile, toast]);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }, [handleFile]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFile(selectedFile);
  }, [handleFile]);

  const removeFile = useCallback(() => {
    setFile(null);
    setStep('upload');
    reset();
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [reset]);

  const handleConfirm = async (excludeErrors: boolean) => {
    if (!parseResult) return;
    const rows = excludeErrors
      ? parseResult.rows.filter((r) => r.errors.length === 0)
      : parseResult.rows;

    try {
      const result = await confirmImport(importType, rows);
      const msgs: string[] = [];
      if (result.created > 0) msgs.push(`${result.created}명 등록`);
      if (result.updated > 0) msgs.push(`${result.updated}명 수정`);
      if (result.failed > 0) msgs.push(`${result.failed}명 실패`);
      toast.success(`업로드 완료: ${msgs.join(', ')}`);
      setStep('template');
      setFile(null);
    } catch {
      toast.error('업로드 확정에 실패했습니다.');
    }
  };

  const desc = TYPE_DESCRIPTION[importType];

  return (
    <div>
      <PageHeader title="일괄 업로드" subtitle="엑셀 파일로 직원 정보를 일괄 관리합니다." />

      <Tabs
        tabs={IMPORT_TABS}
        activeKey={importType}
        onChange={handleTabChange}
        className="mb-6"
      />

      {/* Step 1: Template Download */}
      {step === 'template' && (
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-emerald-500" />
              <h3 className="mt-4 text-lg font-semibold text-gray-800">{desc.title}</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">{desc.desc}</p>
              <div className="mt-6 flex justify-center gap-3">
                <Button onClick={() => downloadTemplate(importType)} variant="secondary">
                  <Download className="h-4 w-4" />
                  템플릿 다운로드
                </Button>
                <Button onClick={() => setStep('upload')}>
                  <Upload className="h-4 w-4" />
                  파일 업로드
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Step 2: File Upload */}
      {step === 'upload' && (
        <div>
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/50'
              }`}
            >
              <Upload className="mb-3 h-10 w-10 text-gray-400" />
              <p className="text-sm font-medium text-gray-600">
                파일을 드래그하거나 클릭하여 업로드
              </p>
              <p className="mt-1 text-xs text-gray-400">
                CSV, XLS, XLSX 파일 (최대 10MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleInputChange}
                className="hidden"
              />
            </div>
          ) : (
            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">{file.name}</p>
                      <p className="text-xs text-gray-400">
                        {(file.size / 1024).toFixed(1)} KB
                        {isParsing && ' · 파싱 중...'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removeFile}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </CardBody>
            </Card>
          )}

          <div className="mt-4 flex justify-between">
            <Button variant="secondary" onClick={() => { setStep('template'); setFile(null); reset(); }}>
              이전
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Preview & Confirm */}
      {step === 'preview' && parseResult && (
        <div>
          {/* Summary Bar */}
          <div className="mb-4 flex items-center gap-4 rounded-lg bg-gray-50 px-4 py-3 text-sm">
            <span className="font-medium text-gray-700">
              전체 <span className="text-indigo-600">{parseResult.totalCount}</span>
            </span>
            <span className="text-gray-400">|</span>
            <span className="flex items-center gap-1 text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              정상 {parseResult.validCount}
            </span>
            {parseResult.errorCount > 0 && (
              <>
                <span className="text-gray-400">|</span>
                <span className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  오류 {parseResult.errorCount}
                </span>
              </>
            )}
            {parseResult.warningCount > 0 && (
              <>
                <span className="text-gray-400">|</span>
                <span className="text-amber-600">
                  경고 {parseResult.warningCount}
                </span>
              </>
            )}
          </div>

          {/* File Info */}
          {file && (
            <Card className="mb-4">
              <CardBody>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-6 w-6 text-emerald-500" />
                    <span className="text-sm font-medium text-gray-700">{file.name}</span>
                  </div>
                  <button onClick={removeFile} className="text-sm text-gray-400 hover:text-gray-600">
                    다시 업로드
                  </button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Preview Table */}
          <div className="rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2.5 text-left w-12">#</th>
                  {parseResult.rows[0] && Object.keys(parseResult.rows[0].data).map((key) => (
                    <th key={key} className="px-3 py-2.5 text-left">{key}</th>
                  ))}
                  <th className="px-3 py-2.5 text-left">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {parseResult.rows.map((row) => (
                  <tr
                    key={row.rowNumber}
                    className={row.errors.length > 0 ? 'bg-red-50' : 'hover:bg-gray-50'}
                  >
                    <td className="px-3 py-2 text-gray-400">{row.rowNumber}</td>
                    {Object.values(row.data).map((val, i) => (
                      <td key={i} className="px-3 py-2 text-gray-700">
                        {val || <span className="text-gray-300">-</span>}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      {row.errors.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {row.errors.map((err, i) => (
                            <Badge key={i} variant="error">{err}</Badge>
                          ))}
                        </div>
                      ) : row.warnings.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {row.warnings.map((w, i) => (
                            <Badge key={i} variant="warning">{w}</Badge>
                          ))}
                        </div>
                      ) : (
                        <Badge variant="success">정상</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="mt-4 flex justify-between">
            <Button variant="secondary" onClick={removeFile}>
              이전
            </Button>
            <div className="flex gap-3">
              {parseResult.errorCount > 0 && parseResult.validCount > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => handleConfirm(true)}
                  disabled={isConfirming}
                >
                  오류 제외하고 업로드 ({parseResult.validCount}건)
                </Button>
              )}
              <Button
                onClick={() => handleConfirm(false)}
                disabled={isConfirming || parseResult.errorCount > 0}
              >
                {isConfirming ? '처리 중...' : `업로드 확인 (${parseResult.validCount}건)`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
