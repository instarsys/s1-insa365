import { NextResponse } from 'next/server';

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function createdResponse<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function noContentResponse() {
  return new NextResponse(null, { status: 204 });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

export function notFoundResponse(entity = 'Resource') {
  return NextResponse.json({ message: `${entity}을(를) 찾을 수 없습니다.` }, { status: 404 });
}

export function forbiddenResponse() {
  return NextResponse.json({ message: '권한이 없습니다.' }, { status: 403 });
}

export function parseSearchParams(url: URL) {
  return {
    page: parseInt(url.searchParams.get('page') || '1', 10),
    limit: parseInt(url.searchParams.get('limit') || '20', 10),
    search: url.searchParams.get('search') || undefined,
    year: url.searchParams.get('year') ? parseInt(url.searchParams.get('year')!, 10) : undefined,
    month: url.searchParams.get('month') ? parseInt(url.searchParams.get('month')!, 10) : undefined,
    date: url.searchParams.get('date') || undefined,
    departmentId: url.searchParams.get('departmentId') || undefined,
    status: url.searchParams.get('status') || undefined,
    userId: url.searchParams.get('userId') || undefined,
  };
}
