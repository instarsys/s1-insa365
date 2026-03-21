import { DomainError } from './DomainError';

export class EntityNotFoundError extends DomainError {
  constructor(entityName: string, id: string) {
    const nameMap: Record<string, string> = {
      Employee: '직원',
      SalaryCalculation: '급여 계산',
      SalaryRule: '급여 규칙',
      LeaveRequest: '휴가 신청',
      LeaveTypeConfig: '휴가 유형',
      LegalParameter: '법정 파라미터',
      MinimumWage: '최저임금',
      Company: '회사',
      WorkPolicy: '근로 정책',
    };
    const korName = nameMap[entityName] || entityName;
    super(`${korName}을(를) 찾을 수 없습니다. (ID: ${id})`);
  }
}
