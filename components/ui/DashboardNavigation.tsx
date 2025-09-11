'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  User, 
  LogOut, 
  Dumbbell, 
  ClipboardList, 
  Apple, 
  TrendingUp,
  Menu,
  X,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DashboardNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const pathname = usePathname()

  const navigationItems = [
    {
      name: 'Workout Generation',
      href: '#',
      icon: Dumbbell,
      isPlaceholder: true,
      description: 'Generate AI-powered workout plans'
    },
    {
      name: 'Workout Logging',
      href: '#',
      icon: ClipboardList,
      isPlaceholder: true,
      description: 'Log and track your workouts'
    },
    {
      name: 'Nutrition Generation',
      href: '#',
      icon: Apple,
      isPlaceholder: true,
      description: 'Generate personalized nutrition plans'
    },
    {
      name: 'Nutrition & Macro Tracking',
      href: '#',
      icon: TrendingUp,
      isPlaceholder: true,
      description: 'Track your nutrition and macros'
    }
  ]

  const userActions = [
    {
      name: 'Profile',
      href: '/profile',
      icon: User,
      isPlaceholder: false
    },
    {
      name: 'Logout',
      href: '/logout',
      icon: LogOut,
      isPlaceholder: false
    }
  ]

  const isActive = (href: string) => {
    if (href === '#') return false
    return pathname === href
  }

  const handlePlaceholderClick = (itemName: string) => {
    alert(`${itemName} feature coming soon! This will be implemented in future phases.`)
  }

  const handleLogoutClick = () => {
    setIsLoggingOut(true)
    // The loading state will be reset when the page redirects
    // Note: We don't need to manually reset it since the component will unmount
  }

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex-shrink-0">
            <Link 
              href="/dashboard" 
              className="text-2xl font-bold text-cornflower-blue hover:text-cornflower-blue/80 transition-colors"
            >
              trAIner
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {/* Feature Navigation */}
            <div className="flex items-center space-x-1 mr-6">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <div key={item.name} className="relative group">
                    {item.isPlaceholder ? (
                      <button
                        onClick={() => handlePlaceholderClick(item.name)}
                        className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 cursor-pointer"
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isActive(item.href)
                            ? 'text-cornflower-blue bg-cornflower-blue/10 border border-cornflower-blue/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    )}
                    
                    {/* Tooltip for placeholder items */}
                    {item.isPlaceholder && (
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 bg-background border border-cornflower-blue/30 rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
                        <p className="text-xs text-foreground">{item.description}</p>
                        <p className="text-xs text-cornflower-blue font-medium">Coming soon!</p>
                        {/* Tooltip arrow pointing up */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-3 border-r-3 border-b-3 border-l-transparent border-r-transparent border-b-cornflower-blue/30"></div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-1 border-l border-border pl-6">
              {userActions.map((action) => {
                const Icon = action.icon
                const isLogout = action.name === 'Logout'
                const showLoader = isLogout && isLoggingOut
                
                return (
                  <Link
                    key={action.name}
                    href={action.href}
                    onClick={isLogout ? handleLogoutClick : undefined}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive(action.href)
                        ? 'text-cornflower-blue bg-cornflower-blue/10 border border-cornflower-blue/20'
                        : isLogout
                        ? `text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 ${isLoggingOut ? 'opacity-75 cursor-not-allowed' : ''}`
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    {showLoader ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                    <span>{isLogout && isLoggingOut ? 'Logging out...' : action.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Feature Navigation */}
              <div className="space-y-1 mb-4">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Features
                </div>
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.name}>
                      {item.isPlaceholder ? (
                        <button
                          onClick={() => {
                            handlePlaceholderClick(item.name)
                            setIsMobileMenuOpen(false)
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 text-left"
                        >
                          <Icon className="w-5 h-5" />
                          <div>
                            <div>{item.name}</div>
                            <div className="text-xs text-muted-foreground">Coming soon</div>
                          </div>
                        </button>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                            isActive(item.href)
                              ? 'text-cornflower-blue bg-cornflower-blue/10 border border-cornflower-blue/20'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          <span>{item.name}</span>
                        </Link>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* User Actions */}
              <div className="space-y-1 border-t border-border pt-4">
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Account
                </div>
                {userActions.map((action) => {
                  const Icon = action.icon
                  const isLogout = action.name === 'Logout'
                  const showLoader = isLogout && isLoggingOut
                  
                  return (
                    <Link
                      key={action.name}
                      href={action.href}
                      onClick={() => {
                        if (isLogout) {
                          handleLogoutClick()
                        }
                        setIsMobileMenuOpen(false)
                      }}
                      className={`flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive(action.href)
                          ? 'text-cornflower-blue bg-cornflower-blue/10 border border-cornflower-blue/20'
                          : isLogout
                          ? `text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 ${isLoggingOut ? 'opacity-75 cursor-not-allowed' : ''}`
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {showLoader ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                      <span>{isLogout && isLoggingOut ? 'Logging out...' : action.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
