'use client';

import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from 'react';
import { PageHeader } from '@/components/layout';
import {
  Button, Card, CardBody, Table, Badge, useToast,
} from '@/components/ui';
import { Upload, FileSpreadsheet, X, AlertTriangle } from 'lucide-react';

interface PreviewRow {
  row: number;
  name: string;
  email: string;
  phone: string;
  department: string;
  position: string;
  joinDate: string;
  baseSalary: string;
  errors: string[];
}

export default function EmployeeImportPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = useCallback((f: File) => {
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (!validTypes.includes(f.type) && !f.name.match(/\.(csv|xlsx|xls)$/i)) {
      toast.error('CSV 또는 Excel 파일만 업로드 가능합니다.');
      return;
    }
    setFile(f);
    // Placeholder: generate mock preview data (actual Excel parsing in Phase 1.5)
    const mockData: PreviewRow[] = [
      { row: 1, name: '김철수', email: 'kim@test.com', phone: '010-1234-5678', department: '개발부', position: '사원', joinDate: '2025-01-15', baseSalary: '3000000', errors: [] },
      { row: 2, name: '이영희', email: 'lee@test.com', phone: '010-2345-6789', department: '영업부', position: '대리', joinDate: '2024-06-01', baseSalary: '3500000', errors: [] },
      { row: 3, name: '', email: 'invalid', phone: '', department: '', position: '', joinDate: '', baseSalary: '', errors: ['이름 누락', '이메일 형식 오류', '부서 누락'] },
    ];
    setPreviewData(mockData);
  }, [toast]);

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
    setPreviewData([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleUpload = async () => {
    const errorRows = previewData.filter((r) => r.errors.length > 0);
    if (errorRows.length > 0) {
      toast.error(`${errorRows.length}개 행에 오류가 있습니다. 수정 후 다시 시도하세요.`);
      return;
    }
    setIsUploading(true);
    // Placeholder: actual upload logic
    setTimeout(() => {
      toast.success('업로드가 완료되었습니다.');
      setIsUploading(false);
      removeFile();
    }, 1500);
  };

  const errorCount = previewData.filter((r) => r.errors.length > 0).length;

  const columns = [
    { key: 'row', label: '#' },
    {
      key: 'name',
      label: '이름',
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as PreviewRow;
        return r.errors.length > 0 && !r.name
          ? <span className="text-red-500">-</span>
          : <span>{r.name}</span>;
      },
    },
    { key: 'email', label: '이메일' },
    { key: 'phone', label: '연락처' },
    { key: 'department', label: '부서' },
    { key: 'position', label: '직급' },
    { key: 'joinDate', label: '입사일' },
    { key: 'baseSalary', label: '기본급' },
    {
      key: 'status',
      label: '상태',
      render: (row: Record<string, unknown>) => {
        const r = row as unknown as PreviewRow;
        return r.errors.length > 0
          ? (
            <div className="flex flex-col gap-1">
              {r.errors.map((err, i) => (
                <Badge key={i} variant="error">{err}</Badge>
              ))}
            </div>
          )
          : <Badge variant="success">정상</Badge>;
      },
    },
  ];

  return (
    <div>
      <PageHeader title="일괄 업로드" subtitle="CSV 파일로 직원 정보를 일괄 등록합니다." />

      {/* Upload Area */}
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
        <Card className="mb-6">
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">{file.name}</p>
                  <p className="text-xs text-gray-400">
                    {(file.size / 1024).toFixed(1)} KB
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

      {/* Preview Table */}
      {previewData.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">
              미리보기 ({previewData.length}건)
            </h3>
            {errorCount > 0 && (
              <div className="flex items-center gap-1 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                {errorCount}건 오류
              </div>
            )}
          </div>

          <div className="rounded-lg border border-gray-200">
            <Table
              columns={columns}
              data={previewData as unknown as Record<string, unknown>[]}
            />
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={isUploading || errorCount > 0}
            >
              {isUploading ? '업로드 중...' : '업로드 확인'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
