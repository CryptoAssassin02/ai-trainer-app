'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react'

const faqs = [
  {
    question: 'How does the AI create my personalized workout, nutrition, and macro plans?',
    answer: 'Our advanced AI analyzes your personal information including age, weight, height, fitness level, goals, available equipment, and dietary preferences. It then uses machine learning algorithms trained on thousands of successful fitness programs to create a completely personalized plan. The AI continuously learns from your progress and feedback to refine and optimize your workouts, nutrition targets, and macro distributions for maximum effectiveness.'
  },
  {
    question: 'Do I need gym equipment to use trAIner?',
    answer: 'Not at all! trAIner is designed to work with whatever equipment you have available - whether that\'s a full commercial gym, basic home equipment, or just your body weight. Our AI adapts your workouts based on your equipment selection during setup. You can even change your available equipment anytime, and the AI will automatically adjust your future workouts accordingly.'
  },
  {
    question: 'Is my health and fitness data secure?',
    answer: 'Absolutely. We take your privacy and data security extremely seriously. All your personal health information is encrypted using industry-standard AES-256 encryption and stored on secure, HIPAA-compliant servers. We never sell your data to third parties, and you maintain full control over your information. You can export or delete your data at any time through your account settings.'
  },
  {
    question: 'Can I use trAIner if I\'m a complete beginner?',
    answer: 'Yes! trAIner is perfect for beginners. Our AI is specifically designed to create safe, effective programs for all fitness levels. For beginners, the AI starts with foundational movements, proper form guidance, and gradual progression. It includes detailed exercise instructions, safety tips, and modifications. The AI also monitors your progress to ensure you\'re advancing at a safe, sustainable pace without risking injury.'
  }
]

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0) // First FAQ open by default

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faqs" className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-cornflower-blue/10 rounded-2xl mb-6">
            <HelpCircle className="w-8 h-8 text-cornflower-blue" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Frequently Asked{' '}
            <span className="text-cornflower-blue bg-gradient-to-r from-cornflower-blue to-blue-400 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Got questions? We've got answers. Here are the most common questions about 
            trAIner's AI-powered fitness platform.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="group bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 hover:border-cornflower-blue/30 transition-all duration-300 overflow-hidden"
            >
              {/* Question Button */}
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full text-left p-6 focus:outline-none focus:ring-2 focus:ring-cornflower-blue/20 focus:ring-inset"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-cornflower-blue transition-colors duration-300 pr-4">
                    {faq.question}
                  </h3>
                  <div className="flex-shrink-0">
                    {openIndex === index ? (
                      <ChevronUp className="w-6 h-6 text-cornflower-blue transition-transform duration-300" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-muted-foreground group-hover:text-cornflower-blue transition-colors duration-300" />
                    )}
                  </div>
                </div>
              </button>

              {/* Answer Content */}
              <div
                className={`transition-all duration-300 ease-in-out ${
                  openIndex === index
                    ? 'max-h-96 opacity-100'
                    : 'max-h-0 opacity-0'
                } overflow-hidden`}
              >
                <div className="px-6 pb-6">
                  <div className="border-t border-border/30 pt-4">
                    <p className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </div>
              </div>

              {/* Subtle background pattern */}
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,rgba(100,149,237,0.1),transparent_50%)]" />
              </div>
            </div>
          ))}
        </div>

        {/* Additional Help Section */}
        <div className="mt-16 text-center p-8 bg-gradient-to-r from-cornflower-blue/5 to-blue-400/5 rounded-2xl border border-cornflower-blue/20">
          <h3 className="text-2xl font-bold text-foreground mb-4">
            Still Have Questions?
          </h3>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Our support team is here to help! Get in touch with us and we'll answer any questions 
            you have about trAIner's features, pricing, or how to get started.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-cornflower-blue hover:bg-cornflower-blue/90 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200">
              Contact Support
            </button>
            <button className="border border-cornflower-blue text-cornflower-blue hover:bg-cornflower-blue hover:text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200">
              View Documentation
            </button>
          </div>
        </div>

        {/* Trust Badge */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-2 text-muted-foreground">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm">24/7 Customer Support Available</span>
          </div>
        </div>
      </div>
    </section>
  )
}
