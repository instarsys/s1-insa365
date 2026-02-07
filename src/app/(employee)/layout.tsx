import { MobileTopBar } from '@/components/layout/MobileTopBar';
import { MobileTabBar } from '@/components/layout/MobileTabBar';

export default function EmployeeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-gray-50">
      <MobileTopBar />
      <main className="pb-14 pt-12">
        <div className="px-4 py-4">{children}</div>
      </main>
      <MobileTabBar />
    </div>
  );
}
