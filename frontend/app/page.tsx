import React from "react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import Link from "next/link";
import { RegisterLink, LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";

const Page = () => {
  return (
    <>
      <LoginLink postLoginRedirectURL="/Dashboard">Sign in</LoginLink>
      <RegisterLink>Sign up</RegisterLink>
      <h1>Landing</h1>
    </>
  )
}

export default Page;