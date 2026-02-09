import HeroSection from '../components/landing/sections/HeroSection';
import FeaturesSection from '../components/landing/sections/FeaturesSection';
import ComparisonSection from '../components/landing/sections/ComparisonSection';
import HowItWorksSection from '../components/landing/sections/HowItWorksSection';
import ScreenshotsSection from '../components/landing/sections/ScreenshotsSection';
import PricingSection from '../components/landing/sections/PricingSection';
import FAQSection from '../components/landing/sections/FAQSection';
import CTASection from '../components/landing/sections/CTASection';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <ComparisonSection />
      <HowItWorksSection />
      <ScreenshotsSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
    </>
  );
}
