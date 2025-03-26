"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Dumbbell, LineChart, User, Settings, HelpCircle, Download } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Workout Plans",
    href: "/workouts",
    icon: Dumbbell,
  },
  {
    title: "Progress Tracking",
    href: "/progress",
    icon: LineChart,
  },
  {
    title: "Profile",
    href: "/profile",
    icon: User,
  },
  {
    title: "Data Transfer",
    href: "/data-transfer",
    icon: Download,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="flex items-center justify-center p-4">
        <div className="flex items-center space-x-2">
          <Dumbbell className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">trAIner</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild isActive={pathname === item.href || pathname.startsWith(item.href + "/")} tooltip={item.title}>
                <Link href={item.href}>
                  <item.icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Account Settings" isActive={pathname === "/account"}>
              <Link href="/account">
                <Settings className="h-5 w-5" />
                <span>Account</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Help" isActive={pathname === "/help"}>
              <Link href="/help">
                <HelpCircle className="h-5 w-5" />
                <span>Help</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

