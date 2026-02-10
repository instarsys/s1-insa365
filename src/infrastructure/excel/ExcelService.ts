/**
 * ExcelService — xlsx 라이브러리 래핑
 * 직원 데이터의 엑셀 내보내기/가져오기 처리
 */
import * as XLSX from 'xlsx';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

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

const EMPLOYEE_COLUMNS: ExcelColumn[] = [
  { header: '이름', key: 'name', width: 15 },
  { header: '이메일', key: 'email', width: 25 },
  { header: '연락처', key: 'phone', width: 15 },
  { header: '부서', key: 'department', width: 15 },
  { header: '직급', key: 'position', width: 12 },
  { header: '입사일', key: 'joinDate', width: 12 },
  { header: '보험모드', key: 'insuranceMode', width: 12 },
];

const UPDATE_COLUMNS: ExcelColumn[] = [
  { header: '사번', key: 'employeeNumber', width: 12 },
  { header: '이름', key: 'name', width: 15 },
  { header: '이메일', key: 'email', width: 25 },
  { header: '연락처', key: 'phone', width: 15 },
  { header: '부서', key: 'department', width: 15 },
  { header: '직급', key: 'position', width: 12 },
];

const WAGES_COLUMNS: ExcelColumn[] = [
  { header: '사번', key: 'employeeNumber', width: 12 },
  { header: '이름', key: 'name', width: 15 },
  { header: '보험모드', key: 'insuranceMode', width: 12 },
];

export class ExcelService {
  /**
   * 직원 목록 → 엑셀 Uint8Array
   */
  exportEmployees(
    employees: Array<{
      employeeNumber?: string | null;
      name: string;
      email: string;
      phone?: string | null;
      department?: { name: string } | null;
      position?: { name: string } | null;
      joinDate?: Date | string | null;
    }>,
  ): Uint8Array {
    const data = employees.map((e) => ({
      사번: e.employeeNumber || '',
      이름: e.name,
      이메일: e.email,
      연락처: e.phone || '',
      부서: e.department?.name || '',
      직급: e.position?.name || '',
      입사일: e.joinDate
        ? new Date(e.joinDate).toISOString().split('T')[0]
        : '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 12 }, { wch: 15 }, { wch: 25 }, { wch: 15 },
      { wch: 15 }, { wch: 12 }, { wch: 12 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '직원목록');
    return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
  }

  /**
   * 템플릿 생성 (신규/수정/근로정보)
   */
  generateTemplate(
    type: 'create' | 'update' | 'wages',
    departments: string[] = [],
    positions: string[] = [],
  ): Uint8Array {
    const columns =
      type === 'create' ? EMPLOYEE_COLUMNS :
      type === 'update' ? UPDATE_COLUMNS :
      WAGES_COLUMNS;

    // 헤더 행 생성
    const headers = columns.map((c) => c.header);
    const ws = XLSX.utils.aoa_to_sheet([headers]);

    // 컬럼 너비
    ws['!cols'] = columns.map((c) => ({ wch: c.width || 12 }));

    const wb = XLSX.utils.book_new();
    const sheetName =
      type === 'create' ? '신규직원' :
      type === 'update' ? '직원수정' :
      '근로정보';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // 참고 시트: 부서/직급 목록
    if (departments.length > 0 || positions.length > 0) {
      const maxLen = Math.max(departments.length, positions.length);
      const refData: string[][] = [['부서', '직급']];
      for (let i = 0; i < maxLen; i++) {
        refData.push([departments[i] || '', positions[i] || '']);
      }
      const refWs = XLSX.utils.aoa_to_sheet(refData);
      refWs['!cols'] = [{ wch: 20 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, refWs, '참고_부서직급');
    }

    return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
  }

  /**
   * 업로드된 엑셀 파싱 + 검증
   */
  parseEmployeeImport(
    buffer: ArrayBuffer | Uint8Array,
    type: 'create' | 'update' | 'wages',
    validDepartments: string[],
    validPositions: string[],
  ): ParseResult {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) {
      return { rows: [], totalCount: 0, validCount: 0, errorCount: 0, warningCount: 0 };
    }

    const rawRows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, {
      defval: '',
      raw: false,
    });

    const columns =
      type === 'create' ? EMPLOYEE_COLUMNS :
      type === 'update' ? UPDATE_COLUMNS :
      WAGES_COLUMNS;

    // 헤더 → key 매핑
    const headerToKey = new Map(columns.map((c) => [c.header, c.key]));

    const rows: ParsedRow[] = rawRows.map((raw, idx) => {
      const data: Record<string, string> = {};
      const errors: string[] = [];
      const warnings: string[] = [];

      // 셀 값 매핑
      for (const [header, value] of Object.entries(raw)) {
        const key = headerToKey.get(header);
        if (key) data[key] = String(value).trim();
      }

      const rowNumber = idx + 2; // 1-based + header row

      // 검증
      if (type === 'create') {
        if (!data.name) errors.push('이름 누락');
        if (!data.email) errors.push('이메일 누락');
        if (data.email && !data.email.includes('@')) errors.push('이메일 형식 오류');
        if (data.department && validDepartments.length > 0 && !validDepartments.includes(data.department)) {
          errors.push(`부서 "${data.department}" 없음`);
        }
        if (data.position && validPositions.length > 0 && !validPositions.includes(data.position)) {
          errors.push(`직급 "${data.position}" 없음`);
        }
        if (data.joinDate && isNaN(Date.parse(data.joinDate))) {
          errors.push('입사일 형식 오류');
        }
        if (data.insuranceMode && !['AUTO', 'MANUAL', 'NONE'].includes(data.insuranceMode)) {
          warnings.push('보험모드 → AUTO로 설정됨');
          data.insuranceMode = 'AUTO';
        }
      }

      if (type === 'update') {
        if (!data.employeeNumber) errors.push('사번 누락');
        if (data.department && validDepartments.length > 0 && !validDepartments.includes(data.department)) {
          errors.push(`부서 "${data.department}" 없음`);
        }
        if (data.position && validPositions.length > 0 && !validPositions.includes(data.position)) {
          errors.push(`직급 "${data.position}" 없음`);
        }
      }

      if (type === 'wages') {
        if (!data.employeeNumber) errors.push('사번 누락');
      }

      return { rowNumber, data, errors, warnings };
    });

    const errorCount = rows.filter((r) => r.errors.length > 0).length;
    const warningCount = rows.filter((r) => r.warnings.length > 0 && r.errors.length === 0).length;

    return {
      rows,
      totalCount: rows.length,
      validCount: rows.length - errorCount,
      errorCount,
      warningCount,
    };
  }
}
