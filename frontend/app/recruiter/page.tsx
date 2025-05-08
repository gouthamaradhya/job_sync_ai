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

export default function RecruiterPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Prevents hydration mismatch

  return (
    <main className="bg-white min-h-screen">
      {/* Navbar - similar to the dashboard page */}
      <div className="flex justify-between shadow-md bg-[#9CAFB7] dark:shadow-gray-800 h-auto">
        <div className="flex gap-2 items-center">
          <Image src="/images/logo.svg" alt="Job Sync AI Logo" width={50} height={50} className="m-2" />
          <h2 className="font-bold text-xl text-logo">Job Sync AI</h2>
        </div>
        <div className="flex gap-5">
          <NavigationMenu>
            <NavigationMenuList>
              {["Home", "About", "Contact", "Help"].map((item) => (
                <NavigationMenuItem key={item}>
                  <Link href={`/${item}`} legacyBehavior passHref>
                    <NavigationMenuLink className={navigationMenuTriggerStyle()}>{item}</NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </div>

      {/* Recruiter Tabs Content */}
      <div className="container mx-auto py-8">
        <RecruiterTabs />
      </div>
    </main>
  );
}