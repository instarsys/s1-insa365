import { AdminTopBar } from '@/components/layout/AdminTopBar';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Providers } from '@/components/layout/Providers';
import { PasswordChangeGuard } from '@/components/layout/PasswordChangeGuard';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { AdminContent } from '@/components/layout/AdminContent';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <PasswordChangeGuard>
        <SidebarProvider>
          <div className="min-h-screen bg-gray-50">
            <AdminTopBar />
            <AdminSidebar />
            <AdminContent>{children}</AdminContent>
          </div>
        </SidebarProvider>
      </PasswordChangeGuard>
    </Providers>
  );
}
