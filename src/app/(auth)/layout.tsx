import { ToastProvider } from '@/components/ui/Toast';

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md px-4">{children}</div>
      </div>
    </ToastProvider>
  );
}
