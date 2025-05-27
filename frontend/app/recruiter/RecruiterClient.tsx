"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import RecruiterTabs from '@/components/recruiter/RecruiterTabs';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { Bell, Moon, Sun, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface user {
  given_name?: string;
  family_name?: string;
  email?: string;
}
interface Props {
  user: user;
}

const RecruiterClient: React.FC<Props> = ({ user }) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState(3);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Prevents hydration mismatch

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <main className="bg-white min-h-screen">
      {/* Enhanced professional navbar */}
      <div className="flex justify-between items-center shadow-lg bg-white dark:bg-gray-900 h-16 sticky top-0 z-50 px-4 md:px-8 border-b border-gray-100 dark:border-gray-800 transition-all duration-300">
        <div className="flex gap-3 items-center">
          <div className="relative group">
            <Image
              src="/images/logo.svg"
              alt="Job Sync AI Logo"
              width={42}
              height={42}
              className="m-1 transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute -bottom-1 left-1/2 w-0 h-0.5 bg-blue-500 group-hover:w-full transition-all duration-300" style={{ transform: 'translateX(-50%)' }}></div>
          </div>
          <h2 className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Job Sync AI</h2>
        </div>

        <div className="flex items-center gap-5">
          <NavigationMenu className="hidden md:block">
            <NavigationMenuList>
              {["Home", "About", "Contact", "Help"].map((item) => (
                <NavigationMenuItem key={item}>
                  <Link href={'/'} passHref>
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                      {item}
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 text-yellow-400" />
              ) : (
                <Moon className="h-5 w-5 text-gray-700" />
              )}
            </Button>

            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                {notifications > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {notifications}
                  </span>
                )}
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="rounded-full p-0 h-10 w-10 overflow-hidden">
                  <Avatar>
                    <AvatarImage src="/images/recruiter-avatar.jpg" alt="Recruiter" />
                    <AvatarFallback className="bg-blue-600 text-white">{user?.given_name?.charAt(0)}{user?.family_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.given_name} {user?.family_name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-500">Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Recruiter Tabs Content - keeping the same structure as original */}
      <div className="container mx-auto py-8">
        <RecruiterTabs />
      </div>
    </main>
  );
}

export default RecruiterClient;