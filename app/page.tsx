import AnimatedPage from '@/components/AnimatedPage'
import FeaturedProductsSection from '@/components/sections/FeaturedProductsSection'
import HeroSection from '@/components/sections/HeroSection'
import TrustSection from '@/components/sections/TrustSection'
import VideoPlaceholderSection from '@/components/sections/VideoPlaceholderSection'
import WhyChooseUsSection from '@/components/sections/WhyChooseUsSection'
import CustomerFeedbackSection from '@/components/sections/CustomerFeedbackSection'

export default function Home() {
  return (
    <AnimatedPage>
      <div className="space-y-0">
        <HeroSection />
        <VideoPlaceholderSection />
        <WhyChooseUsSection />
        <FeaturedProductsSection />
        <TrustSection />
        <CustomerFeedbackSection />
      </div>
    </AnimatedPage>
  )
}

