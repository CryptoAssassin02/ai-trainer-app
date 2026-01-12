'use client'

import Link from 'next/link'
import { Heart, Mail, MapPin, Phone } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  const socialLinks = [
    { name: 'LinkedIn', href: '#', placeholder: true },
    { name: 'Instagram', href: '#', placeholder: true },
    { name: 'Facebook', href: '#', placeholder: true },
    { name: 'Twitter', href: '#', placeholder: true }
  ]

  const footerLinks = {
    product: [
      { name: 'Features', href: '#features' },
      { name: 'Pricing', href: '#pricing' },
      { name: 'API', href: '#api' },
      { name: 'Integrations', href: '#integrations' }
    ],
    company: [
      { name: 'About Us', href: '#about' },
      { name: 'Careers', href: '#careers' },
      { name: 'Blog', href: '#blog' },
      { name: 'Press', href: '#press' }
    ],
    support: [
      { name: 'Help Center', href: '#help' },
      { name: 'Contact Us', href: '#contact' },
      { name: 'Status', href: '#status' },
      { name: 'Community', href: '#community' }
    ],
    legal: [
      { name: 'Privacy Policy', href: '#privacy' },
      { name: 'Terms of Service', href: '#terms' },
      { name: 'Cookie Policy', href: '#cookies' },
      { name: 'GDPR', href: '#gdpr' }
    ]
  }

  return (
    <footer className="bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
            {/* Brand Section */}
            <div className="lg:col-span-2">
              <Link href="/" className="text-2xl font-bold text-cornflower-blue hover:text-cornflower-blue/80 transition-colors">
                trAIner
              </Link>
              <p className="mt-4 text-muted-foreground leading-relaxed max-w-sm">
                Optimize your fitness journey with AI-powered personalization. 
                Get smarter workouts, better nutrition, and faster results.
              </p>
              
              {/* Contact Info Placeholders */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center space-x-3 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm">contact@trainer-ai.com</span>
                </div>
                <div className="flex items-center space-x-3 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center space-x-3 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">San Francisco, CA</span>
                </div>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h3 className="text-foreground font-semibold mb-4">Product</h3>
              <ul className="space-y-3">
                {footerLinks.product.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href} 
                      className="text-muted-foreground hover:text-cornflower-blue transition-colors duration-200 text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h3 className="text-foreground font-semibold mb-4">Company</h3>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href} 
                      className="text-muted-foreground hover:text-cornflower-blue transition-colors duration-200 text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support Links */}
            <div>
              <h3 className="text-foreground font-semibold mb-4">Support</h3>
              <ul className="space-y-3">
                {footerLinks.support.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href} 
                      className="text-muted-foreground hover:text-cornflower-blue transition-colors duration-200 text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h3 className="text-foreground font-semibold mb-4">Legal</h3>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.name}>
                    <Link 
                      href={link.href} 
                      className="text-muted-foreground hover:text-cornflower-blue transition-colors duration-200 text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-border py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="flex items-center space-x-2 text-muted-foreground text-sm">
              <span>© {currentYear} trAIner. All rights reserved.</span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <span>Made with</span>
                <Heart className="w-4 h-4 text-red-500 fill-current" />
                <span>for fitness enthusiasts</span>
              </span>
            </div>

            {/* Social Links */}
            <div className="flex items-center space-x-6">
              <span className="text-muted-foreground text-sm">Follow us:</span>
              {socialLinks.map((social) => (
                <div key={social.name} className="group">
                  {social.placeholder ? (
                    <div className="w-8 h-8 bg-muted/50 rounded-lg border border-border/50 flex items-center justify-center group-hover:border-cornflower-blue/30 transition-colors duration-200">
                      <span className="text-xs text-muted-foreground font-medium">
                        {social.name.charAt(0)}
                      </span>
                    </div>
                  ) : (
                    <Link
                      href={social.href}
                      className="w-8 h-8 bg-muted/50 rounded-lg border border-border/50 flex items-center justify-center hover:border-cornflower-blue/30 hover:bg-cornflower-blue/10 transition-colors duration-200"
                      aria-label={`Follow us on ${social.name}`}
                    >
                      <span className="text-xs text-cornflower-blue font-medium">
                        {social.name.charAt(0)}
                      </span>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-6 pt-6 border-t border-border/50">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-2 md:space-y-0 text-xs text-muted-foreground">
              <div className="flex items-center space-x-4">
                <span>🔒 Your data is secure and encrypted</span>
                <span>•</span>
                <span>🌍 Available worldwide</span>
                <span>•</span>
                <span>📱 Mobile app coming soon</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>All systems operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
