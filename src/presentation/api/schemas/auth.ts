import { z } from 'zod';
import { validateBusinessNumber } from '@/domain/value-objects/BusinessNumber';

export const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

export const signupSchema = z.object({
  companyName: z.string().min(1, '회사명을 입력해주세요.').max(100),
  businessNumber: z.string()
    .min(1, '사업자등록번호를 입력해주세요.')
    .max(20)
    .refine((val) => validateBusinessNumber(val).valid, {
      message: '유효하지 않은 사업자등록번호입니다.',
    }),
  representativeName: z.string().min(1, '대표자명을 입력해주세요.').max(50),
  employeeCountRange: z.string().optional(),
  name: z.string().min(1, '이름을 입력해주세요.').max(50),
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').max(100),
  termsAgreed: z.literal(true, { message: '이용약관에 동의해주세요.' }),
  privacyAgreed: z.literal(true, { message: '개인정보 처리방침에 동의해주세요.' }),
  marketingAgreed: z.boolean().optional().default(false),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
