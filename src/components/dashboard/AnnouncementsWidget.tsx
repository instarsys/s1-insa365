'use client';

import { Card, CardHeader, CardTitle, CardBody, Badge, Spinner, EmptyState } from '@/components/ui';
import { useAnnouncements } from '@/hooks/useDashboard';
import { Megaphone } from 'lucide-react';

const CATEGORY_LABEL: Record<string, string> = {
  NEWS: '뉴스',
  NEW_FEATURE: '신규기능',
  NOTICE: '공지',
  UPDATE: '업데이트',
};

const CATEGORY_VARIANT: Record<string, 'info' | 'success' | 'warning' | 'gray'> = {
  NEWS: 'info',
  NEW_FEATURE: 'success',
  NOTICE: 'warning',
  UPDATE: 'gray',
};

export function AnnouncementsWidget() {
  const { items, isLoading } = useAnnouncements();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-indigo-500" />
          <CardTitle>공지사항</CardTitle>
          {items.length > 0 && <Badge variant="info">{items.length}</Badge>}
        </div>
      </CardHeader>
      <CardBody className="p-0">
        {isLoading ? (
          <Spinner text="로딩중..." className="py-6" />
        ) : items.length === 0 ? (
          <EmptyState title="공지사항 없음" description="등록된 공지사항이 없습니다." />
        ) : (
          <ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                <Badge variant={CATEGORY_VARIANT[item.category] ?? 'gray'} className="mt-0.5 shrink-0">
                  {CATEGORY_LABEL[item.category] ?? item.category}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {item.title}
                    {item.isNew && (
                      <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {new Date(item.publishedAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
