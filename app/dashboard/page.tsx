import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Dashboard() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  
  if (error || !data?.user) {
    redirect('/login')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Dashboard
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Welcome to your fitness app dashboard!
            </p>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {data.user.email}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">User ID</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {data.user.id}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Your Fitness Goals
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Track your progress and set new goals
            </p>
          </div>
          <div className="border-t border-gray-200 p-6">
            <p className="text-center text-gray-500 italic">
              Your personalized fitness plan will appear here.
            </p>
          </div>
        </div>

        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              AI Fitness Assistant
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Get personalized recommendations and assistance
            </p>
          </div>
          <div className="border-t border-gray-200 p-6">
            <p className="text-center text-gray-500 italic">
              Your AI fitness assistant will be available here soon!
            </p>
          </div>
        </div>

        <form
          action={async () => {
            'use server'
            const supabase = await createClient()
            await supabase.auth.signOut()
            redirect('/login')
          }}
        >
          <button
            type="submit"
            className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
} 