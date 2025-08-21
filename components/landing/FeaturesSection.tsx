'use client'

import Link from 'next/link'
import { Brain, Activity, Apple, TrendingUp } from 'lucide-react'
import Image from 'next/image'

const features = [
  {
    icon: Brain,
    title: 'Smart Workout Generation',
    description: 'Experience the power of AI-Generated Workouts tailored specifically to your fitness level, goals, and available equipment. Our intelligent system creates Personalized AI-Generated Workouts that evolve with your progress.',
    placeholder: '/feature1-placeholder.png',
    alt: 'AI workout personalization in trAIner web app'
  },
  {
    icon: Activity,
    title: 'Real-time Intelligent Progress Tracking',
    description: 'AI tracks your progress and goals and provides feedback and analytics in real-time. Monitor your performance, identify patterns, and receive intelligent insights to optimize your fitness journey.',
    placeholder: '/feature2-placeholder.png',
    alt: 'Real-time progress tracking in trAIner'
  },
  {
    icon: Apple,
    title: 'Personalized Nutrition & Macro Tracking',
    description: 'AI generates nutrition and macro plans/goals and tracks them as well. Get customized meal recommendations, macro targets, and nutritional guidance that adapts to your workout intensity and goals.',
    placeholder: '/feature3-placeholder.png',
    alt: 'AI nutrition tracking in trAIner app'
  },
  {
    icon: TrendingUp,
    title: 'Adaptive Training Plans',
    description: 'Your training plans intelligently adapt based on your progress, feedback, and performance data. The AI continuously learns from your workouts to optimize future sessions and prevent plateaus.',
    placeholder: '/feature4-placeholder.png',
    alt: 'Adaptive training plans in trAIner'
  }
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Powerful Features for{' '}
            <span className="text-cornflower-blue bg-gradient-to-r from-cornflower-blue to-blue-400 bg-clip-text text-transparent">
              Smart Fitness
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Discover how our AI-powered platform transforms your fitness journey with intelligent, 
            personalized features designed to help you achieve your goals faster and more effectively.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {features.map((feature, index) => {
            const IconComponent = feature.icon
            return (
              <div
                key={index}
                className="group relative bg-background/50 backdrop-blur-sm rounded-2xl p-8 border border-border/50 hover:border-cornflower-blue/30 transition-all duration-300 hover:shadow-lg hover:shadow-cornflower-blue/10"
              >
                {/* Feature Image Placeholder */}
                <div className="relative mb-6 overflow-hidden rounded-xl">
                  <div className="aspect-video bg-gradient-to-br from-muted/80 to-muted/40 flex items-center justify-center border border-border/30 group-hover:border-cornflower-blue/20 transition-colors duration-300">
                    {/* Placeholder mockup content */}
                    <div className="text-center space-y-3">
                      <div className="w-16 h-16 bg-cornflower-blue/20 rounded-2xl flex items-center justify-center mx-auto group-hover:bg-cornflower-blue/30 transition-colors duration-300">
                        <IconComponent className="w-8 h-8 text-cornflower-blue" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-cornflower-blue/30 rounded w-24 mx-auto" />
                        <div className="h-2 bg-muted rounded w-16 mx-auto" />
                        <div className="h-2 bg-muted rounded w-20 mx-auto" />
                      </div>
                    </div>
                  </div>
                  
                  {/* Glow effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cornflower-blue/0 via-cornflower-blue/5 to-cornflower-blue/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                </div>

                {/* Feature Content */}
                <div className="space-y-4">
                  {/* Icon and Title */}
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-cornflower-blue/10 rounded-xl flex items-center justify-center group-hover:bg-cornflower-blue/20 transition-colors duration-300">
                      <IconComponent className="w-6 h-6 text-cornflower-blue" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground group-hover:text-cornflower-blue transition-colors duration-300">
                      {feature.title}
                    </h3>
                  </div>

                  {/* Description */}
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Learn More Link */}
                  <div className="pt-2">
                    <button className="text-cornflower-blue font-semibold hover:text-cornflower-blue/80 transition-colors duration-200 group/link">
                      Learn more
                      <span className="inline-block ml-1 group-hover/link:translate-x-1 transition-transform duration-200">→</span>
                    </button>
                  </div>
                </div>

                {/* Subtle background pattern */}
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(100,149,237,0.1),transparent_50%)]" />
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-muted-foreground mb-6">
            Ready to experience the future of fitness?
          </p>
          <Link 
            href="/auth/signup"
            className="inline-block bg-cornflower-blue hover:bg-cornflower-blue/90 text-white font-semibold px-8 py-3 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
          >
            Start Your Free Trial
          </Link>
        </div>
      </div>
    </section>
  )
}
