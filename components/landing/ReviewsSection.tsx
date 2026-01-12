'use client'

import Link from 'next/link'
import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'John Smith',
    location: 'Austin, TX',
    rating: 5,
    text: 'Review coming soon from beta testers. The AI-powered workout plans have completely transformed my fitness routine. The personalization is incredible!',
    avatar: '/avatar-placeholder.png',
    role: 'Fitness Enthusiast'
  },
  {
    name: 'Dave Johnson',
    location: 'Seattle, WA',
    rating: 5,
    text: 'Review coming soon from beta testers. The nutrition tracking and macro recommendations are spot-on. I\'ve never felt more confident about my diet.',
    avatar: '/avatar-placeholder.png',
    role: 'Personal Trainer'
  },
  {
    name: 'Sarah Williams',
    location: 'Miami, FL',
    rating: 4,
    text: 'Review coming soon from beta testers. The real-time progress tracking keeps me motivated every day. The AI insights are surprisingly accurate.',
    avatar: '/avatar-placeholder.png',
    role: 'Busy Professional'
  }
]

export function ReviewsSection() {
  return (
    <section id="reviews" className="py-24 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            What Our Users{' '}
            <span className="text-cornflower-blue bg-gradient-to-r from-cornflower-blue to-blue-400 bg-clip-text text-transparent">
              Are Saying
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Don't just take our word for it. Here's what real users have to say about their 
            transformative experience with trAIner's AI-powered fitness platform.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="group relative bg-background/70 backdrop-blur-sm rounded-2xl p-8 border border-border/50 hover:border-cornflower-blue/30 transition-all duration-300 hover:shadow-lg hover:shadow-cornflower-blue/10"
            >
              {/* Quote Icon */}
              <div className="absolute top-6 right-6 opacity-20 group-hover:opacity-30 transition-opacity duration-300">
                <Quote className="w-8 h-8 text-cornflower-blue" />
              </div>

              {/* Rating Stars */}
              <div className="flex items-center space-x-1 mb-6">
                {[...Array(5)].map((_, starIndex) => (
                  <Star
                    key={starIndex}
                    className={`w-5 h-5 ${
                      starIndex < testimonial.rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm text-muted-foreground font-medium">
                  {testimonial.rating}.0
                </span>
              </div>

              {/* Testimonial Text */}
              <blockquote className="text-foreground leading-relaxed mb-6 italic">
                "{testimonial.text}"
              </blockquote>

              {/* User Info */}
              <div className="flex items-center space-x-4">
                {/* Avatar Placeholder */}
                <div className="w-12 h-12 bg-gradient-to-br from-cornflower-blue/20 to-blue-400/20 rounded-full flex items-center justify-center border-2 border-cornflower-blue/20 group-hover:border-cornflower-blue/40 transition-colors duration-300">
                  <span className="text-cornflower-blue font-semibold text-lg">
                    {testimonial.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>

                {/* User Details */}
                <div>
                  <div className="font-semibold text-foreground group-hover:text-cornflower-blue transition-colors duration-300">
                    {testimonial.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.role}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.location}
                  </div>
                </div>
              </div>

              {/* Verified Badge */}
              <div className="absolute bottom-4 right-4 opacity-60 group-hover:opacity-80 transition-opacity duration-300">
                <div className="flex items-center space-x-1 text-xs text-cornflower-blue font-medium">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Verified User</span>
                </div>
              </div>

              {/* Subtle background pattern */}
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(100,149,237,0.1),transparent_50%)]" />
              </div>
            </div>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center space-x-8 p-6 bg-background/50 rounded-2xl border border-border/30">
            <div className="flex items-center space-x-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <span className="text-foreground font-semibold">4.9/5</span>
            </div>
            <div className="h-6 w-px bg-border"></div>
            <div className="text-muted-foreground">
              <span className="font-semibold text-foreground">1,000+</span> Happy Users
            </div>
            <div className="h-6 w-px bg-border"></div>
            <div className="text-muted-foreground">
              <span className="font-semibold text-foreground">50,000+</span> Workouts Completed
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-6">
            Join thousands of satisfied users transforming their fitness journey
          </p>
          <Link 
            href="/auth/signup"
            className="inline-block bg-cornflower-blue hover:bg-cornflower-blue/90 text-white font-semibold px-8 py-3 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
          >
            Start Your Success Story
          </Link>
        </div>
      </div>
    </section>
  )
}
