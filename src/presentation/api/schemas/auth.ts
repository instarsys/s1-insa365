import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

export const signupSchema = z.object({
  companyName: z.string().min(1, '회사명을 입력해주세요.').max(100),
  businessNumber: z.string().min(1, '사업자등록번호를 입력해주세요.').max(20),
  representativeName: z.string().min(1, '대표자명을 입력해주세요.').max(50),
  name: z.string().min(1, '이름을 입력해주세요.').max(50),
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').max(100),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
