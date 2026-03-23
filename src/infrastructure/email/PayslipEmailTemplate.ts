/**
 * 급여명세서 이메일 HTML 템플릿 빌더
 * - 인라인 CSS만 사용 (이메일 클라이언트 호환)
 * - 외부 리소스 미사용
 */

interface PayItem {
  label: string;
  amount: number;
  hours?: number;
  description?: string;
  [key: string]: unknown;
}

interface DeductionItem {
  label: string;
  amount: number;
  [key: string]: unknown;
}

function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원';
}

export function buildPayslipEmailHtml(params: {
  companyName: string;
  employeeName: string;
  employeeNumber: string;
  departmentName: string;
  year: number;
  month: number;
  payItems: PayItem[];
  deductionItems: DeductionItem[];
  totalPay: number;
  totalDeduction: number;
  netPay: number;
}): string {
  const payRows = params.payItems
    .filter((item) => item.amount !== 0)
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:14px;">
          ${item.label}
          ${item.hours != null ? `<div style="font-size:11px;color:#9ca3af;">${Number(item.hours) < 1 ? Math.round(Number(item.hours) * 60) + '분' : Number(item.hours) + '시간'}</div>` : ''}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;font-variant-numeric:tabular-nums;${item.amount < 0 ? 'color:#dc2626;' : 'color:#374151;'}">
          ${formatKRW(item.amount)}
        </td>
      </tr>`,
    )
    .join('');

  const deductionRows = params.deductionItems
    .filter((item) => item.amount !== 0)
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:14px;">${item.label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:14px;font-variant-numeric:tabular-nums;color:#dc2626;">
          ${formatKRW(item.amount)}
        </td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4f46e5,#4338ca);border-radius:12px 12px 0 0;padding:24px 28px;color:#ffffff;">
      <h1 style="margin:0;font-size:18px;font-weight:700;">급여명세서</h1>
      <p style="margin:6px 0 0;font-size:14px;color:#c7d2fe;">${params.companyName} | ${params.year}년 ${params.month}월</p>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:24px 28px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">

      <!-- Employee Info -->
      <table style="width:100%;margin-bottom:24px;background:#f9fafb;border-radius:8px;" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:12px 16px;width:25%;">
            <div style="font-size:11px;color:#6b7280;">이름</div>
            <div style="font-size:14px;font-weight:600;color:#1f2937;margin-top:2px;">${params.employeeName}</div>
          </td>
          <td style="padding:12px 16px;width:25%;">
            <div style="font-size:11px;color:#6b7280;">사번</div>
            <div style="font-size:14px;font-weight:600;color:#1f2937;margin-top:2px;">${params.employeeNumber || '-'}</div>
          </td>
          <td style="padding:12px 16px;width:50%;">
            <div style="font-size:11px;color:#6b7280;">부서</div>
            <div style="font-size:14px;font-weight:600;color:#1f2937;margin-top:2px;">${params.departmentName || '-'}</div>
          </td>
        </tr>
      </table>

      <!-- Pay Items -->
      <h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#1d4ed8;">지급 항목</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;" cellpadding="0" cellspacing="0">
        <thead>
          <tr style="border-bottom:2px solid #e5e7eb;">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:500;">항목</th>
            <th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:500;">금액</th>
          </tr>
        </thead>
        <tbody>
          ${payRows}
          <tr style="border-top:2px solid #bfdbfe;">
            <td style="padding:10px 12px;font-size:14px;font-weight:700;color:#1d4ed8;">총 지급액</td>
            <td style="padding:10px 12px;text-align:right;font-size:14px;font-weight:700;color:#1d4ed8;font-variant-numeric:tabular-nums;">${formatKRW(params.totalPay)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Deduction Items -->
      <h3 style="margin:24px 0 12px;font-size:14px;font-weight:600;color:#b91c1c;">공제 항목</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;" cellpadding="0" cellspacing="0">
        <thead>
          <tr style="border-bottom:2px solid #e5e7eb;">
            <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:500;">항목</th>
            <th style="padding:8px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:500;">금액</th>
          </tr>
        </thead>
        <tbody>
          ${deductionRows}
          <tr style="border-top:2px solid #fecaca;">
            <td style="padding:10px 12px;font-size:14px;font-weight:700;color:#b91c1c;">총 공제액</td>
            <td style="padding:10px 12px;text-align:right;font-size:14px;font-weight:700;color:#b91c1c;font-variant-numeric:tabular-nums;">${formatKRW(params.totalDeduction)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Net Pay -->
      <div style="margin-top:24px;background:#ecfdf5;border-radius:8px;padding:20px;text-align:center;">
        <div style="font-size:13px;color:#059669;">실수령액</div>
        <div style="font-size:28px;font-weight:800;color:#047857;margin-top:6px;font-variant-numeric:tabular-nums;">
          ${formatKRW(params.netPay)}
        </div>
      </div>

      <!-- Footer -->
      <p style="margin:24px 0 0;font-size:11px;color:#9ca3af;text-align:center;">
        본 메일은 ${params.companyName}에서 insa365를 통해 자동 발송되었습니다.
      </p>
    </div>
  </div>
</body>
</html>`;
}
