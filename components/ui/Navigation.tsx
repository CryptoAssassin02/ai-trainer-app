'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { Sun, Moon, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // Ensure component is mounted before rendering theme toggle
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
      setIsMenuOpen(false) // Close mobile menu after clicking
    }
  }

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'Why Choose Us', href: '#why-choose-us' },
    { name: 'Reviews', href: '#reviews' },
    { name: 'FAQs', href: '#faqs' },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-2xl font-bold text-cornflower-blue hover:text-cornflower-blue/80 transition-colors">
              trAIner
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => scrollToSection(link.href.substring(1))}
                className="text-foreground hover:text-cornflower-blue transition-colors duration-200 font-medium"
              >
                {link.name}
              </button>
            ))}
            <Link
              href="/login"
              className="text-foreground hover:text-cornflower-blue transition-colors duration-200 font-medium"
            >
              Login
            </Link>
          </div>

          {/* Desktop CTA and Theme Toggle */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Theme Toggle */}
            {mounted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="p-2 hover:bg-accent"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5 text-cornflower-blue" />
                ) : (
                  <Moon className="h-5 w-5 text-cornflower-blue" />
                )}
              </Button>
            )}
            
            {/* Get Started CTA */}
            <Link href="/auth/signup">
              <Button className="bg-cornflower-blue hover:bg-cornflower-blue/90 text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-200">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Mobile menu button and theme toggle */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Mobile Theme Toggle */}
            {mounted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="p-2 hover:bg-accent"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5 text-cornflower-blue" />
                ) : (
                  <Moon className="h-5 w-5 text-cornflower-blue" />
                )}
              </Button>
            )}
            
            {/* Hamburger Menu */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-accent"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6 text-foreground" />
              ) : (
                <Menu className="h-6 w-6 text-foreground" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu - Slide out from right */}
        <div className={`md:hidden fixed inset-y-0 right-0 w-64 bg-background border-l border-border transform transition-transform duration-300 ease-in-out ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        } z-50`}>
          <div className="flex flex-col h-full pt-16 pb-6 px-6">
            <div className="flex flex-col space-y-6">
              {navLinks.map((link) => (
                <button
                  key={link.name}
                  onClick={() => scrollToSection(link.href.substring(1))}
                  className="text-left text-lg font-medium text-foreground hover:text-cornflower-blue transition-colors duration-200"
                >
                  {link.name}
                </button>
              ))}
              <Link
                href="/login"
                className="text-left text-lg font-medium text-foreground hover:text-cornflower-blue transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Login
              </Link>
            </div>
            
            {/* Mobile CTA */}
            <div className="mt-8">
              <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)}>
                <Button className="w-full bg-cornflower-blue hover:bg-cornflower-blue/90 text-white font-semibold py-3 rounded-lg transition-colors duration-200">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsMenuOpen(false)}
          />
        )}
      </div>
    </nav>
  )
}
