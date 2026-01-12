import type { Metadata } from 'next'
import { Navigation } from '../components/ui/Navigation'
import { HeroSection } from '../components/landing/HeroSection'
import { FeaturesSection } from '../components/landing/FeaturesSection'
import { WhyChooseUsSection } from '../components/landing/WhyChooseUsSection'
import { ReviewsSection } from '../components/landing/ReviewsSection'
import { FAQSection } from '../components/landing/FAQSection'
import { CTASection } from '../components/landing/CTASection'
import { Footer } from '../components/ui/Footer'

export const metadata: Metadata = {
  title: 'trAIner - AI-Powered Fitness Trainer Web App',
  description: 'Optimize your fitness journey with AI-powered personalization. Get personalized workout plans, nutrition tracking, and intelligent progress monitoring.',
  keywords: ['AI fitness trainer web app', 'personalized workout plans', 'nutrition tracking', 'AI fitness coach', 'smart workout generation', 'fitness app'],
  authors: [{ name: 'trAIner Team' }],
  creator: 'trAIner',
  publisher: 'trAIner',
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://trainer-ai.com',
    siteName: 'trAIner',
    title: 'trAIner - AI-Powered Fitness Trainer Web App',
    description: 'Optimize your fitness journey with AI-powered personalization. Get personalized workout plans, nutrition tracking, and intelligent progress monitoring.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'trAIner AI Fitness App Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'trAIner - AI-Powered Fitness Trainer Web App',
    description: 'Optimize your fitness journey with AI-powered personalization. Get personalized workout plans, nutrition tracking, and intelligent progress monitoring.',
    images: ['/twitter-image.png'],
    creator: '@trainer_ai',
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <HeroSection />
        <FeaturesSection />
        <WhyChooseUsSection />
        <ReviewsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  )
}
