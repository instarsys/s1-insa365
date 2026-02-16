import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/presentation/middleware/withAuth';
import { FormulaEngine } from '@/domain/services/FormulaEngine';
import { getAllowanceVariables, getDeductionVariables } from '@/domain/services/FormulaVariables';

async function handlePost(request: NextRequest, _auth: AuthContext) {
  const body = await request.json();
  const { formula, type } = body as { formula?: string; type?: string };

  if (!formula || typeof formula !== 'string') {
    return NextResponse.json(
      { valid: false, error: '수식이 비어 있습니다', variables: [] },
      { status: 400 },
    );
  }

  const result = FormulaEngine.validate(formula);

  if (result.valid && type) {
    // 사용 가능한 변수 범위 검증
    const availableKeys = new Set(
      (type === 'ALLOWANCE' ? getAllowanceVariables() : getDeductionVariables()).map(
        (v) => v.key,
      ),
    );
    const unknownVars = result.variables.filter((v) => !availableKeys.has(v));
    if (unknownVars.length > 0) {
      return NextResponse.json({
        valid: false,
        error: `사용할 수 없는 변수: ${unknownVars.join(', ')}`,
        variables: result.variables,
      });
    }
  }

  return NextResponse.json(result);
}

const wrapped = withAuth(handlePost);
export const POST = wrapped as (request: NextRequest) => Promise<NextResponse>;
