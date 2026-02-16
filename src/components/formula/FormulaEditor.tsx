'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { Delete, RotateCcw } from 'lucide-react';
import { FormulaEngine } from '@/domain/services/FormulaEngine';
import { FormulaDisplay } from './FormulaDisplay';
import { VariablePanel } from './VariablePanel';

interface FormulaEditorProps {
  value: string;
  onChange: (formula: string) => void;
  type: 'ALLOWANCE' | 'DEDUCTION';
}

const NUMBER_BUTTONS = [
  ['7', '8', '9', '/'],
  ['4', '5', '6', '*'],
  ['1', '2', '3', '-'],
  ['0', '.', '(', '+'],
  [')', ','],
];

const FUNCTION_BUTTONS = [
  'floor', 'round', 'min', 'max',
  'truncate1', 'truncate10', 'clamp', 'taxLookup',
];

/** 수당 변수에 대한 예시 값 */
const ALLOWANCE_SAMPLE_CONTEXT: Record<string, number> = {
  통상시급: 15311,
  기본급: 3000000,
  시급: 15311,
  연장근로분: 600,
  야간근로분: 120,
  야간연장근로분: 0,
  휴일근로분_8이내: 480,
  휴일근로분_8초과: 120,
  휴일야간근로분_8이내: 0,
  휴일야간근로분_8초과: 0,
  정규근로분: 9600,
  총근로분: 10920,
  근무일수: 20,
};

/** 공제 변수에 대한 예시 값 */
const DEDUCTION_SAMPLE_CONTEXT: Record<string, number> = {
  과세소득: 3200000,
  비과세합계: 400000,
  총지급액: 3600000,
  연금기준소득: 3200000,
  건강보험기준소득: 3200000,
  연금하한: 390000,
  연금상한: 6170000,
  국민연금요율: 4.5,
  건강보험요율: 3.545,
  장기요양요율: 12.95,
  고용보험요율: 0.9,
  부양가족수: 1,
  국민연금: 144000,
  건강보험: 113440,
  소득세: 90000,
};

function formatNumber(n: number): string {
  return n.toLocaleString('ko-KR');
}

export function FormulaEditor({ value, onChange, type }: FormulaEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [cursorPos, setCursorPos] = useState(value.length);

  // 검증 결과
  const validation = useMemo(() => FormulaEngine.validate(value), [value]);

  // 예시 계산 결과
  const sampleResult = useMemo(() => {
    if (!validation.valid || !value.trim()) return null;
    try {
      const ctx = type === 'ALLOWANCE' ? ALLOWANCE_SAMPLE_CONTEXT : DEDUCTION_SAMPLE_CONTEXT;
      const result = FormulaEngine.evaluate(value, ctx);
      return { value: result, error: null };
    } catch (e) {
      return { value: null, error: e instanceof Error ? e.message : '계산 오류' };
    }
  }, [value, validation.valid, type]);

  // 커서 위치에 텍스트 삽입
  const insertAtCursor = useCallback(
    (text: string) => {
      const newValue = value.slice(0, cursorPos) + text + value.slice(cursorPos);
      const newPos = cursorPos + text.length;
      onChange(newValue);
      setCursorPos(newPos);
      // 포커스 복구
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    },
    [value, cursorPos, onChange],
  );

  // 변수 삽입
  const handleVariableInsert = useCallback(
    (variable: string) => {
      insertAtCursor(variable);
    },
    [insertAtCursor],
  );

  // 연산자/숫자 버튼 클릭
  const handleButtonClick = useCallback(
    (char: string) => {
      insertAtCursor(char);
    },
    [insertAtCursor],
  );

  // 함수 삽입
  const handleFunctionInsert = useCallback(
    (fn: string) => {
      insertAtCursor(`${fn}(`);
    },
    [insertAtCursor],
  );

  // 백스페이스
  const handleBackspace = useCallback(() => {
    if (cursorPos <= 0) return;
    const newValue = value.slice(0, cursorPos - 1) + value.slice(cursorPos);
    const newPos = cursorPos - 1;
    onChange(newValue);
    setCursorPos(newPos);
  }, [value, cursorPos, onChange]);

  // 전체 지우기
  const handleClear = useCallback(() => {
    onChange('');
    setCursorPos(0);
  }, [onChange]);

  // 입력 필드 변경
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setCursorPos(e.target.selectionStart ?? e.target.value.length);
    },
    [onChange],
  );

  // 커서 위치 추적
  const handleInputSelect = useCallback((e: React.SyntheticEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    setCursorPos(input.selectionStart ?? input.value.length);
  }, []);

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* 수식 디스플레이 */}
      <div className="border-b border-gray-200 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">수식</span>
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <RotateCcw className="h-3 w-3" />
            지우기
          </button>
        </div>
        {value.trim() ? (
          <div className="mb-2 min-h-[28px]">
            <FormulaDisplay formula={value} />
          </div>
        ) : (
          <div className="mb-2 min-h-[28px] text-xs text-gray-300">
            아래에서 변수와 연산자를 선택하세요
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onSelect={handleInputSelect}
          onClick={handleInputSelect}
          onKeyUp={handleInputSelect}
          placeholder="수식을 직접 입력하거나 아래 버튼으로 조합하세요"
          className="w-full rounded border border-gray-200 bg-gray-50 px-3 py-1.5 font-mono text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-200"
        />
      </div>

      {/* 변수 패널 + 연산자 패드 */}
      <div className="grid grid-cols-2 gap-0 divide-x divide-gray-200">
        {/* 좌측: 변수 패널 */}
        <div className="max-h-[280px] overflow-y-auto p-2">
          <VariablePanel type={type} onInsert={handleVariableInsert} />
        </div>

        {/* 우측: 연산자/함수 패드 */}
        <div className="p-2">
          {/* 숫자/연산자 그리드 */}
          <div className="mb-2 space-y-1">
            {NUMBER_BUTTONS.map((row, ri) => (
              <div key={ri} className="flex gap-1">
                {row.map((char) => (
                  <button
                    key={char}
                    type="button"
                    onClick={() => handleButtonClick(char)}
                    className="flex h-8 flex-1 items-center justify-center rounded border border-gray-200 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    {char}
                  </button>
                ))}
                {ri === NUMBER_BUTTONS.length - 1 && (
                  <button
                    type="button"
                    onClick={handleBackspace}
                    className="flex h-8 flex-1 items-center justify-center rounded border border-gray-200 bg-red-50 text-sm font-medium text-red-500 hover:bg-red-100 transition-colors"
                    title="한 글자 삭제"
                  >
                    <Delete className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* 내장 함수 */}
          <div className="space-y-1">
            <div className="px-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              함수
            </div>
            <div className="flex flex-wrap gap-1">
              {FUNCTION_BUTTONS.map((fn) => (
                <button
                  key={fn}
                  type="button"
                  onClick={() => handleFunctionInsert(fn)}
                  className="rounded border border-purple-200 bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors"
                >
                  {fn}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 검증 결과 */}
      <div className="border-t border-gray-200 px-3 py-2">
        {!value.trim() ? (
          <div className="text-xs text-gray-400">수식을 입력하세요</div>
        ) : validation.valid ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-green-600">
              <span>✅</span>
              <span>유효한 수식입니다.</span>
              {validation.variables.length > 0 && (
                <span className="text-gray-500">
                  변수: {validation.variables.join(', ')}
                </span>
              )}
            </div>
            {sampleResult && sampleResult.value !== null && (
              <div className="text-xs text-gray-500">
                📌 예시 결과: <strong className="text-gray-700">{formatNumber(sampleResult.value)}원</strong>
                <span className="text-gray-400"> (테스트 값 기준)</span>
              </div>
            )}
            {sampleResult && sampleResult.error && (
              <div className="text-xs text-amber-600">
                ⚠️ 예시 계산 실패: {sampleResult.error}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-red-600">
            <span>❌</span>
            <span>{validation.error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
