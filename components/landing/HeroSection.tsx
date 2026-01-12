'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ArrowRight, Sparkles } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background/50" />
      
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(100,149,237,0.1),transparent_50%)]" />
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text Content - Left side on desktop, top on mobile */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-cornflower-blue/10 border border-cornflower-blue/20 mb-6">
              <Sparkles className="w-4 h-4 text-cornflower-blue mr-2" />
              <span className="text-sm font-medium text-cornflower-blue">AI-Powered Fitness Revolution</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Optimize Your{' '}
              <span className="text-cornflower-blue bg-gradient-to-r from-cornflower-blue to-blue-400 bg-clip-text text-transparent">
                Fitness Journey
              </span>{' '}
              with AI-Powered Personalization
            </h1>

            {/* Subheading */}
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Experience the future of fitness with personalized workout plans, intelligent nutrition tracking, 
              and real-time progress monitoring—all powered by advanced AI that adapts to your unique goals.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <Link href="/auth/signup">
                <Button 
                  size="lg" 
                  className="bg-cornflower-blue hover:bg-cornflower-blue/90 text-white font-semibold px-8 py-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl group"
                >
                  Sign Up Now
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-cornflower-blue text-cornflower-blue hover:bg-cornflower-blue hover:text-white font-semibold px-8 py-4 rounded-lg transition-all duration-200"
                >
                  Get Started
                </Button>
              </Link>
            </div>

            {/* Partnership Logos */}
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground font-medium">
                Trusted by fitness enthusiasts worldwide
              </p>
              <div className="flex flex-wrap justify-center lg:justify-start items-center gap-6 opacity-60">
                {/* Placeholder partnership logos */}
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center w-32 h-12 bg-muted/50 rounded-lg border border-border/50"
                  >
                    <span className="text-xs text-muted-foreground font-medium">
                      Coming Soon
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hero Image - Right side on desktop, top on mobile */}
          <div className="relative order-1 lg:order-2">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              {/* Glow effect behind image */}
              <div className="absolute inset-0 bg-gradient-to-r from-cornflower-blue/20 to-blue-400/20 rounded-2xl blur-3xl transform scale-110" />
              
              {/* Main hero image placeholder */}
              <div className="relative bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl border border-border/50 p-8 backdrop-blur-sm">
                {/* Mockup dashboard interface */}
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/30">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-cornflower-blue rounded-full flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-semibold text-foreground">trAIner Dashboard</span>
                    </div>
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                  </div>

                  {/* Workout plan preview */}
                  <div className="p-4 bg-background/30 rounded-lg border border-border/20">
                    <h3 className="font-semibold text-cornflower-blue mb-3">Today's AI-Generated Workout</h3>
                    <div className="space-y-2">
                      {['Push-ups: 3 sets × 12 reps', 'Squats: 3 sets × 15 reps', 'Plank: 3 sets × 45s'].map((exercise, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                          <span className="text-foreground">{exercise}</span>
                          <div className="w-4 h-4 border-2 border-cornflower-blue rounded" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Progress chart placeholder */}
                  <div className="p-4 bg-background/30 rounded-lg border border-border/20">
                    <h3 className="font-semibold text-cornflower-blue mb-3">Progress Analytics</h3>
                    <div className="h-20 bg-gradient-to-r from-cornflower-blue/20 to-blue-400/20 rounded flex items-end justify-around p-2">
                      {[40, 65, 45, 80, 60].map((height, i) => (
                        <div
                          key={i}
                          className="bg-cornflower-blue rounded-t w-6 transition-all duration-1000 ease-out"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-cornflower-blue rounded-full mt-2 animate-pulse" />
        </div>
      </div>
    </section>
  )
}
