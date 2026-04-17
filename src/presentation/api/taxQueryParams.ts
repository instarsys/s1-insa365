import { errorResponse } from './helpers';

type ParsedNumberResult =
  | { value: number; response?: never }
  | { value?: never; response: Response };

type ParsedStringResult =
  | { value: string; response?: never }
  | { value?: never; response: Response };

export function parseYearParam(url: URL): ParsedNumberResult {
  const raw = url.searchParams.get('year');
  if (raw == null) {
    return { value: new Date().getFullYear() };
  }

  const year = Number(raw);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { response: errorResponse('year 파라미터가 올바르지 않습니다.', 400) };
  }

  return { value: year };
}

export function parseMonthParam(url: URL): ParsedNumberResult {
  const raw = url.searchParams.get('month');
  if (raw == null) {
    return { value: 1 };
  }

  const month = Number(raw);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { response: errorResponse('month 파라미터는 1~12 사이의 정수여야 합니다.', 400) };
  }

  return { value: month };
}

export function parseHalfParam(url: URL): ParsedNumberResult {
  const raw = url.searchParams.get('half');
  if (raw == null) {
    return { value: 1 };
  }

  const half = Number(raw);
  if (half !== 1 && half !== 2) {
    return { response: errorResponse('half 파라미터는 1 또는 2여야 합니다.', 400) };
  }

  return { value: half };
}

export function parseRequiredUserIdParam(url: URL): ParsedStringResult {
  const userId = url.searchParams.get('userId')?.trim();
  if (!userId) {
    return { response: errorResponse('userId 파라미터가 필요합니다.', 400) };
  }

  return { value: userId };
}
