"use client"

import { Hero } from '@/components/ui/animated-hero'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/browser'
import { useEffect, useState } from 'react'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    getUser()
  }, [supabase])

  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">AI Fitness Trainer</h1>
          <div className="flex space-x-4">
            {!loading && (
              user ? (
                <Link 
                  href="/dashboard" 
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Dashboard
                </Link>
              ) : (
                <Link 
                  href="/login" 
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Login
                </Link>
              )
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-grow">
        <Hero />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              AI-Powered Fitness Training
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
              Get personalized workout plans, nutrition advice, and motivation from your AI fitness coach.
            </p>
            
            {!loading && !user && (
              <div className="mt-8">
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 mx-4"
                >
                  Sign up
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 mx-4"
                >
                  Login
                </Link>
              </div>
            )}
            
            {!loading && user && (
              <div className="mt-8">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Go to Dashboard
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <footer className="bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-300">
            © {new Date().getFullYear()} AI Fitness Trainer. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
