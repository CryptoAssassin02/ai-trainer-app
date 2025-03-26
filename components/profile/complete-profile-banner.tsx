"use client"

import { useProfile } from "@/lib/profile-context"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function CompleteProfileBanner() {
  const { isProfileComplete } = useProfile()

  if (isProfileComplete) {
    return null
  }

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Complete Your Profile</AlertTitle>
      <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <span>Please complete your profile to get personalized workout recommendations.</span>
        <Button asChild size="sm" variant="outline" className="whitespace-nowrap">
          <Link href="/profile">Complete Profile</Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
} 