import Script from 'next/script';
import { AdminTopBar } from '@/components/layout/AdminTopBar';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { Providers } from '@/components/layout/Providers';
import { AuthGuard } from '@/components/layout/PasswordChangeGuard';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { AdminContent } from '@/components/layout/AdminContent';

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <AuthGuard>
        <SidebarProvider>
          <div className="min-h-screen bg-gray-50">
            <AdminTopBar />
            <AdminSidebar />
            <AdminContent>{children}</AdminContent>
          </div>
        </SidebarProvider>
      </AuthGuard>
      {process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY && (
        <Script
          src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY}&autoload=false`}
          strategy="afterInteractive"
        />
      )}
    </Providers>
  );
}
