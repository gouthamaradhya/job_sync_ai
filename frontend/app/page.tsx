import React from "react";
import { Button } from "@/components/ui/button";
import { RegisterLink, LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import Card from "@/components/Card";

const Page = () => {
  return (
    <>
      <nav className="flex justify-between shadow-md opacity-90 fixed top-0 left-0 right-0 z-10 bg-white">
        <div className="flex gap-2 items-center">
          <Image src="/images/logo.svg" alt="Job Sync AI Logo" width={50} height={50} className="m-2" />
          <h2 className="font-bold text-xl text-logo">Job Sync AI</h2>
        </div>
        <ul className="flex gap-4 p-2">
          <li>
            <RegisterLink>
              <Button className="bg-white text-secondary border hover:bg-tertiary border-secondary">
                Sign up
              </Button>
            </RegisterLink>
          </li>

          <li>
            <LoginLink postLoginRedirectURL="/dashboard">
              <Button className="bg-secondary hover:bg-secondary-dark">
                Log In
              </Button>
            </LoginLink>
          </li>
        </ul>
      </nav>
      <h1 className="text-3xl font-bold text-primary text-center mt-24">AI THAT WORKS FOR YOUR CARRER</h1>
      <blockquote className="mt-6 border-l-2 pl-6 italic w-1/2 mx-auto">
        AI-powered job matching that connects talent with the right opportunities. Upload your resume, get personalized recommendations, and upskill for better career prospects—all in one place.
      </blockquote>
      <div className="md:flex justify-center gap-10 mt-20">
        <Card title="Job Seekers"
          main_image="/images/seeker.png"
          image1="/images/ai.png"
          image2="/images/resume.png"
          image3="/images/goal.png"
          point1="AI-powered job recommendations"
          point2="Resume parsing & skill matching"
          point3="Personalized upskilling courses"
          button="Start Your Job Search" />

        <Card title="Job Recruiters"
          main_image="/images/recruiter.png"
          image1="/images/ai.png"
          image2="/images/job.png"
          image3="/images/analytics.png"
          point1="AI-Powered Candidate Matching"
          point2="Effortless Job Posting"
          point3="Analytics Dashboard"
          button="Post a Job" />
      </div>
      <footer className="bg-gray-200 w-full gap-10 mt-10">
        <div className=" grid grid-cols-4 gap-10">
          <div className="col-span-1 mt-5 ml-5">
            <h1 className="text-2xl font-bold text-logo">
              Job Sync AI
            </h1>
            <p className="text-md">AI-powered job matching platform that connects talent with the right opportunities.</p>
          </div>
          <div className="col-span-1 mt-5">
            <h1 className="text-xl font-bold">
              For Job Seekers
            </h1>
            <ul >
              <li className="mt-3">Browse Jobs</li>
              <li className="mt-3">Upload Resume</li>
              <li className="mt-3">Carrer Resources</li>
            </ul>
          </div>
          <div className="col-span-1 mt-5">
            <h1 className="text-xl font-bold">
              For Job Recruiters
            </h1>
            <ul >
              <li className="mt-3">Post a Job</li>
              <li className="mt-3">Talent Search</li>
              <li className="mt-3">Analytics Dashboard</li>
            </ul>
          </div>
        </div>
        <hr className="border-t-2 border-gray-400 mt-5" />
        <p className="text-center mt-10 pb-5">© 2025 Job Sync AI. All Rights Reserved.</p>
      </footer>

    </>
  )
}

export default Page;