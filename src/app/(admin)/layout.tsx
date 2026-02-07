import { AdminTopBar } from '@/components/layout/AdminTopBar';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Providers } from '@/components/layout/Providers';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <div className="min-h-screen bg-gray-50">
        <AdminTopBar />
        <AdminSidebar />
        <main className="pl-60 pt-14">
          <div className="mx-auto max-w-[1280px] p-8">{children}</div>
        </main>
      </div>
    </Providers>
  );
}
