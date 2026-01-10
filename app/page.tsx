import AnimatedPage from '@/components/AnimatedPage'
import FeaturedProductsSection from '@/components/sections/FeaturedProductsSection'
import FloatingMillets from '@/components/sections/FloatingMillets'
import MarqueeBanner from '@/components/ui/MarqueeBanner'
import CinematicHeroSection from '@/components/sections/CinematicHeroSection'
import HeroSection from '@/components/sections/HeroSection'
import TrustSection from '@/components/sections/TrustSection'
import VideoPlaceholderSection from '@/components/sections/VideoPlaceholderSection'
import WhyChooseUsSection from '@/components/sections/WhyChooseUsSection'
import TestimonialsSection from '@/components/sections/TestimonialsSection'

export default function Home() {
  return (
    <AnimatedPage>
      {/* Background animation - millets, nuts, and malt floating */}
      <FloatingMillets />

      <div className="relative space-y-0" style={{ zIndex: 1 }}>
        {/* Full width marquee flush with header - Breaking out of max-w-7xl container */}
        <div
          className="relative w-screen left-[50%] right-[50%] -ml-[50vw] mr-[-50vw] mt-0"
        >
          <MarqueeBanner />
        </div>
        <CinematicHeroSection />
        <HeroSection />
        <VideoPlaceholderSection />
        <WhyChooseUsSection />
        <FeaturedProductsSection />
        <TestimonialsSection />
        <TrustSection />
      </div>
    </AnimatedPage>
  )
}

