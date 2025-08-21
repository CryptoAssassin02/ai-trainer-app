'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CTASection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-background via-muted/20 to-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(100,149,237,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(100,149,237,0.05),transparent_50%)]" />
      
      <div className="max-w-6xl mx-auto relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-cornflower-blue/10 border border-cornflower-blue/20 mb-6">
              <Zap className="w-4 h-4 text-cornflower-blue mr-2" />
              <span className="text-sm font-medium text-cornflower-blue">Start Your Transformation Today</span>
            </div>

            {/* Main Heading */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Ready to Transform Your{' '}
              <span className="text-cornflower-blue bg-gradient-to-r from-cornflower-blue to-blue-400 bg-clip-text text-transparent">
                Fitness Journey?
              </span>
            </h2>

            {/* Subheading */}
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Join thousands of users who have already transformed their lives with AI-powered 
              fitness plans. Start your personalized journey today and see results faster than ever before.
            </p>

            {/* Benefits List */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8 text-left">
              {[
                'Personalized AI workout plans',
                'Smart nutrition tracking',
                'Real-time progress analytics',
                '24/7 intelligent support'
              ].map((benefit, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-cornflower-blue/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 bg-cornflower-blue rounded-full" />
                  </div>
                  <span className="text-foreground font-medium">{benefit}</span>
                </div>
              ))}
            </div>

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

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center lg:justify-start items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Free to start</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* CTA Image Placeholder */}
          <div className="relative">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              {/* Glow effect behind image */}
              <div className="absolute inset-0 bg-gradient-to-r from-cornflower-blue/20 to-blue-400/20 rounded-2xl blur-3xl transform scale-110" />
              
              {/* Main CTA image placeholder */}
              <div className="relative bg-gradient-to-br from-muted/50 to-muted/30 rounded-2xl border border-border/50 p-8 backdrop-blur-sm">
                {/* Success screen mockup */}
                <div className="space-y-6">
                  {/* Header */}
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-r from-cornflower-blue to-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Welcome to trAIner!</h3>
                    <p className="text-muted-foreground">Your AI fitness journey starts now</p>
                  </div>

                  {/* Progress indicators */}
                  <div className="space-y-3">
                    {[
                      { label: 'Profile Setup', progress: 100, color: 'bg-green-400' },
                      { label: 'AI Analysis', progress: 100, color: 'bg-cornflower-blue' },
                      { label: 'Plan Generation', progress: 75, color: 'bg-cornflower-blue' }
                    ].map((item, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground font-medium">{item.label}</span>
                          <span className="text-muted-foreground">{item.progress}%</span>
                        </div>
                        <div className="w-full bg-muted/50 rounded-full h-2">
                          <div 
                            className={`${item.color} h-2 rounded-full transition-all duration-1000 ease-out`}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Success message */}
                  <div className="text-center p-4 bg-cornflower-blue/10 rounded-lg border border-cornflower-blue/20">
                    <p className="text-cornflower-blue font-semibold">🎉 Your personalized plan is ready!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { number: '10,000+', label: 'Happy Users' },
            { number: '50,000+', label: 'Workouts Generated' },
            { number: '95%', label: 'Success Rate' },
            { number: '4.9★', label: 'User Rating' }
          ].map((stat, index) => (
            <div key={index}>
              <div className="text-3xl md:text-4xl font-bold text-cornflower-blue mb-2">
                {stat.number}
              </div>
              <div className="text-muted-foreground font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
