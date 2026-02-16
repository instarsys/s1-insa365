/**
 * FormulaVariables — 급여 산식에 사용 가능한 변수 레지스트리.
 *
 * UI 변수 목록 표시 + 검증에 사용.
 * `availableFor` 필드로 수당/공제별 변수 필터링.
 */

export type VariableCategory =
  | 'salary'    // 급여 변수
  | 'attendance' // 근태 변수
  | 'income'    // 소득 변수
  | 'insurance' // 보험 변수
  | 'cascade';  // 이전 공제 결과 (순차 참조)

export type AvailableFor = 'ALLOWANCE' | 'DEDUCTION' | 'BOTH';

export interface FormulaVariable {
  key: string;
  label: string;
  category: VariableCategory;
  unit: string;
  availableFor: AvailableFor;
}

// ─── 수당용 변수 (급여 + 근태) ──────────────────────────────────

const SALARY_VARIABLES: FormulaVariable[] = [
  { key: '통상시급', label: '통상시급 (Phase 1)', category: 'salary', unit: '원', availableFor: 'ALLOWANCE' },
  { key: '기본급', label: 'A01 기본급', category: 'salary', unit: '원', availableFor: 'ALLOWANCE' },
  { key: '시급', label: '시급제 시급', category: 'salary', unit: '원', availableFor: 'ALLOWANCE' },
];

const ATTENDANCE_VARIABLES: FormulaVariable[] = [
  { key: '연장근로분', label: '연장근로 시간', category: 'attendance', unit: '분', availableFor: 'ALLOWANCE' },
  { key: '야간근로분', label: '야간근로 시간', category: 'attendance', unit: '분', availableFor: 'ALLOWANCE' },
  { key: '야간연장근로분', label: '야간+연장 근로', category: 'attendance', unit: '분', availableFor: 'ALLOWANCE' },
  { key: '휴일근로분_8이내', label: '휴일근로 8시간 이내', category: 'attendance', unit: '분', availableFor: 'ALLOWANCE' },
  { key: '휴일근로분_8초과', label: '휴일근로 8시간 초과', category: 'attendance', unit: '분', availableFor: 'ALLOWANCE' },
  { key: '휴일야간근로분_8이내', label: '휴일+야간 8시간 이내', category: 'attendance', unit: '분', availableFor: 'ALLOWANCE' },
  { key: '휴일야간근로분_8초과', label: '휴일+야간 8시간 초과', category: 'attendance', unit: '분', availableFor: 'ALLOWANCE' },
  { key: '정규근로분', label: '정규 근로 시간', category: 'attendance', unit: '분', availableFor: 'ALLOWANCE' },
  { key: '총근로분', label: '총 근로 시간', category: 'attendance', unit: '분', availableFor: 'ALLOWANCE' },
  { key: '근무일수', label: '총 근무 일수', category: 'attendance', unit: '일', availableFor: 'ALLOWANCE' },
];

// ─── 공제용 변수 (소득 + 보험 + 순차 참조) ───────────────────────

const INCOME_VARIABLES: FormulaVariable[] = [
  { key: '과세소득', label: 'Phase 3 과세소득', category: 'income', unit: '원', availableFor: 'DEDUCTION' },
  { key: '비과세합계', label: '비과세 합계', category: 'income', unit: '원', availableFor: 'DEDUCTION' },
  { key: '총지급액', label: 'Phase 2 총지급액', category: 'income', unit: '원', availableFor: 'DEDUCTION' },
];

const INSURANCE_VARIABLES: FormulaVariable[] = [
  { key: '연금기준소득', label: '국민연금 기준소득', category: 'insurance', unit: '원', availableFor: 'DEDUCTION' },
  { key: '건강보험기준소득', label: '건강보험 기준소득', category: 'insurance', unit: '원', availableFor: 'DEDUCTION' },
  { key: '연금하한', label: '국민연금 하한', category: 'insurance', unit: '원', availableFor: 'DEDUCTION' },
  { key: '연금상한', label: '국민연금 상한', category: 'insurance', unit: '원', availableFor: 'DEDUCTION' },
  { key: '국민연금요율', label: '국민연금 요율 (%)', category: 'insurance', unit: '%', availableFor: 'DEDUCTION' },
  { key: '건강보험요율', label: '건강보험 요율 (%)', category: 'insurance', unit: '%', availableFor: 'DEDUCTION' },
  { key: '장기요양요율', label: '장기요양 요율 (%)', category: 'insurance', unit: '%', availableFor: 'DEDUCTION' },
  { key: '고용보험요율', label: '고용보험 요율 (%)', category: 'insurance', unit: '%', availableFor: 'DEDUCTION' },
  { key: '부양가족수', label: '부양가족 수', category: 'insurance', unit: '명', availableFor: 'DEDUCTION' },
];

const CASCADE_VARIABLES: FormulaVariable[] = [
  { key: '국민연금', label: '국민연금 공제액', category: 'cascade', unit: '원', availableFor: 'DEDUCTION' },
  { key: '건강보험', label: '건강보험 공제액', category: 'cascade', unit: '원', availableFor: 'DEDUCTION' },
  { key: '소득세', label: '소득세 공제액', category: 'cascade', unit: '원', availableFor: 'DEDUCTION' },
];

// ─── All Variables ─────────────────────────────────────────────

export const ALL_FORMULA_VARIABLES: FormulaVariable[] = [
  ...SALARY_VARIABLES,
  ...ATTENDANCE_VARIABLES,
  ...INCOME_VARIABLES,
  ...INSURANCE_VARIABLES,
  ...CASCADE_VARIABLES,
];

// ─── Public Helpers ────────────────────────────────────────────

/** 수당 편집 시 사용 가능한 변수 */
export function getAllowanceVariables(): FormulaVariable[] {
  return ALL_FORMULA_VARIABLES.filter(
    (v) => v.availableFor === 'ALLOWANCE' || v.availableFor === 'BOTH',
  );
}

/** 공제 편집 시 사용 가능한 변수 */
export function getDeductionVariables(): FormulaVariable[] {
  return ALL_FORMULA_VARIABLES.filter(
    (v) => v.availableFor === 'DEDUCTION' || v.availableFor === 'BOTH',
  );
}

/** 카테고리별 그룹핑 */
export function getVariablesByCategory(
  type: 'ALLOWANCE' | 'DEDUCTION',
): Map<VariableCategory, FormulaVariable[]> {
  const vars = type === 'ALLOWANCE' ? getAllowanceVariables() : getDeductionVariables();
  const map = new Map<VariableCategory, FormulaVariable[]>();

  for (const v of vars) {
    const list = map.get(v.category) ?? [];
    list.push(v);
    map.set(v.category, list);
  }

  return map;
}

/** 카테고리 한글명 */
export function getCategoryLabel(category: VariableCategory): string {
  switch (category) {
    case 'salary': return '급여 변수';
    case 'attendance': return '근태 변수';
    case 'income': return '소득 변수';
    case 'insurance': return '보험 변수';
    case 'cascade': return '이전 공제 결과';
    default: return category;
  }
}

/** 변수 키 → 변수 정보 조회 */
export function findVariable(key: string): FormulaVariable | undefined {
  return ALL_FORMULA_VARIABLES.find((v) => v.key === key);
}

/** 유효한 변수인지 확인 */
export function isKnownVariable(key: string): boolean {
  return ALL_FORMULA_VARIABLES.some((v) => v.key === key);
}
