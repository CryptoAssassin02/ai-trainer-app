"use client"

import Link from "next/link"
import { Dumbbell } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <SidebarTrigger className="mr-2" />
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center space-x-2">
            <Dumbbell className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block text-xl">trAIner</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end">{/* Add user profile or other header items here */}</div>
      </div>
    </header>
  )
}

