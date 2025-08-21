'use client'

import Link from 'next/link'
import { CheckCircle, Zap, Target, Shield } from 'lucide-react'

const benefits = [
  {
    icon: Target,
    title: 'Personalized Plans?',
    description: 'Get workout and nutrition plans tailored specifically to your body type, fitness level, goals, and available equipment. Our AI analyzes your unique profile to create plans that work for YOU.',
    features: [
      'Custom workout routines based on your fitness level',
      'Personalized nutrition plans for your goals',
      'Equipment-specific exercise recommendations',
      'Goal-oriented training progressions'
    ]
  },
  {
    icon: Zap,
    title: 'Equipment Flexibility?',
    description: 'Whether you have a full gym, basic equipment, or just your body weight, our AI adapts your workouts to what you have available. No equipment? No problem.',
    features: [
      'Bodyweight-only workout options',
      'Home gym equipment adaptations',
      'Full commercial gym routines',
      'Travel-friendly exercise alternatives'
    ]
  },
  {
    icon: CheckCircle,
    title: 'Nutrition Guidance?',
    description: 'Receive intelligent macro calculations, meal suggestions, and nutritional tracking that adapts to your workout intensity and recovery needs for optimal results.',
    features: [
      'Personalized macro and calorie targets',
      'Meal timing optimization',
      'Supplement recommendations',
      'Progress-based nutrition adjustments'
    ]
  },
  {
    icon: Shield,
    title: 'Real-Time Feedback?',
    description: 'Get instant insights on your progress, form corrections, and adaptive recommendations that help you stay motivated and injury-free throughout your fitness journey.',
    features: [
      'Live progress tracking and analytics',
      'Injury prevention recommendations',
      'Motivation and accountability features',
      'Performance optimization insights'
    ]
  }
]

export function WhyChooseUsSection() {
  return (
    <section id="why-choose-us" className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Why Choose{' '}
            <span className="text-cornflower-blue bg-gradient-to-r from-cornflower-blue to-blue-400 bg-clip-text text-transparent">
              trAIner?
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Discover what makes our AI-powered fitness platform the smart choice for 
            achieving your health and fitness goals faster and more effectively.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {benefits.map((benefit, index) => {
            const IconComponent = benefit.icon
            return (
              <div
                key={index}
                className="group relative bg-card/50 backdrop-blur-sm rounded-2xl p-8 border border-border/50 hover:border-cornflower-blue/30 transition-all duration-300 hover:shadow-lg hover:shadow-cornflower-blue/10"
              >
                {/* Icon and Title */}
                <div className="flex items-start space-x-4 mb-6">
                  <div className="w-14 h-14 bg-cornflower-blue/10 rounded-2xl flex items-center justify-center group-hover:bg-cornflower-blue/20 transition-colors duration-300 flex-shrink-0">
                    <IconComponent className="w-7 h-7 text-cornflower-blue" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground group-hover:text-cornflower-blue transition-colors duration-300 mb-3">
                      {benefit.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>

                {/* Feature List */}
                <div className="space-y-3">
                  {benefit.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-start space-x-3">
                      <CheckCircle className="w-5 h-5 text-cornflower-blue mt-0.5 flex-shrink-0" />
                      <span className="text-foreground font-medium">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Benefit Icon Placeholder */}
                <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
                  <div className="w-16 h-16 bg-cornflower-blue/20 rounded-2xl flex items-center justify-center">
                    <IconComponent className="w-8 h-8 text-cornflower-blue" />
                  </div>
                </div>

                {/* Subtle background pattern */}
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(100,149,237,0.1),transparent_50%)]" />
                </div>
              </div>
            )
          })}
        </div>

        {/* Stats Section */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { number: '10,000+', label: 'Active Users' },
            { number: '50,000+', label: 'Workouts Generated' },
            { number: '95%', label: 'Success Rate' },
            { number: '24/7', label: 'AI Support' }
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-cornflower-blue mb-2">
                {stat.number}
              </div>
              <div className="text-muted-foreground font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 p-8 bg-gradient-to-r from-cornflower-blue/5 to-blue-400/5 rounded-2xl border border-cornflower-blue/20">
          <h3 className="text-2xl font-bold text-foreground mb-4">
            Ready to Experience the Difference?
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Join thousands of users who have transformed their fitness journey with our AI-powered platform. 
            Start your personalized experience today.
          </p>
          <Link 
            href="/auth/signup"
            className="inline-block bg-cornflower-blue hover:bg-cornflower-blue/90 text-white font-semibold px-8 py-3 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
          >
            Start Free Trial
          </Link>
        </div>
      </div>
    </section>
  )
}
