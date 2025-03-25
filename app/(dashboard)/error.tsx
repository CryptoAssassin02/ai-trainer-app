'use client'

import { useEffect } from 'react'
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex h-[70vh] w-full flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h2 className="text-xl font-semibold">Something went wrong!</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          We encountered an error while processing your request. Please try again or contact support if the problem persists.
        </p>
        <Button 
          onClick={reset}
          className="mt-4"
        >
          Try again
        </Button>
      </div>
    </div>
  )
} 