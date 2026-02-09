import LandingHeader from '../components/landing/LandingHeader';
import LandingFooter from '../components/landing/LandingFooter';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <main>{children}</main>
      <LandingFooter />
    </div>
  );
}
