import { useState, useCallback } from 'react';
import { apiPost } from '@/lib/api';

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
  warnings: string[];
}

export interface ParseResult {
  rows: ParsedRow[];
  totalCount: number;
  validCount: number;
  errorCount: number;
  warningCount: number;
}

export interface ConfirmResult {
  created: number;
  updated: number;
  failed: number;
  total: number;
}

export function useEmployeeImport() {
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const downloadTemplate = useCallback(async (type: 'create' | 'update' | 'wages') => {
    const urlMap = {
      create: '/api/employees/template',
      update: '/api/employees/template/update',
      wages: '/api/employees/template/wages',
    };
    const res = await fetch(urlMap[type], { credentials: 'include' });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee_${type}_template.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const downloadExport = useCallback(async () => {
    const res = await fetch('/api/employees/export', { credentials: 'include' });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employees_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const parseFile = useCallback(async (file: File, type: 'create' | 'update' | 'wages') => {
    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const res = await fetch('/api/employees/import/parse', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('파싱 실패');
      const result: ParseResult = await res.json();
      setParseResult(result);
      return result;
    } finally {
      setIsParsing(false);
    }
  }, []);

  const confirmImport = useCallback(async (type: string, rows: ParsedRow[]) => {
    setIsConfirming(true);
    try {
      const result = await apiPost<ConfirmResult>('/api/employees/import/confirm', { type, rows });
      setParseResult(null);
      return result;
    } finally {
      setIsConfirming(false);
    }
  }, []);

  const reset = useCallback(() => {
    setParseResult(null);
  }, []);

  return {
    parseResult,
    isParsing,
    isConfirming,
    downloadTemplate,
    downloadExport,
    parseFile,
    confirmImport,
    reset,
  };
}
