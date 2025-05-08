"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RegisterLink, LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import Image from "next/image";
import Card from "@/components/Card";
import { motion } from "framer-motion";
import { ChevronDown, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

const Page = () => {
  const [scrollY, setScrollY] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const navVariants = {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: "easeOut"
      }
    }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Enhanced Navbar with Animation */}
      <motion.nav
        className={`flex justify-between items-center px-6 py-3 fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrollY > 10
          ? "bg-white dark:bg-gray-900 shadow-lg backdrop-blur-md bg-opacity-90 dark:bg-opacity-90"
          : "bg-transparent"
          }`}
        initial="initial"
        animate="animate"
        variants={navVariants}
      >
        <div className="flex gap-3 items-center">
          <div className="relative group cursor-pointer">
            <Image
              src="/images/logo.svg"
              alt="Job Sync AI Logo"
              width={48}
              height={48}
              className="transition-transform duration-300 group-hover:scale-110"
            />
            <div className="absolute -bottom-1 left-1/2 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-full transition-all duration-300" style={{ transform: 'translateX(-50%)' }}></div>
          </div>
          <h2 className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Job Sync AI</h2>
        </div>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-6">
          <ul className="flex gap-6 font-medium">
            {["Home", "About", "Features", "Pricing"].map((item, index) => (
              <li key={index}>
                <Link href={`/`} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors relative group">
                  {item}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 dark:bg-blue-400 group-hover:w-full transition-all duration-300"></span>
                </Link>
              </li>
            ))}
          </ul>

          <RegisterLink>
            <Button className="bg-white text-blue-600 border border-blue-600 hover:bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700 transition-all duration-300 rounded-full px-6">
              Sign up
            </Button>
          </RegisterLink>

          <LoginLink postLoginRedirectURL="/dashboard">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 rounded-full px-6 shadow-md hover:shadow-lg">
              Log In
            </Button>
          </LoginLink>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <div className="w-6 h-0.5 bg-gray-800 dark:bg-gray-200 mb-1.5 transition-transform duration-300 ease-in-out" style={{ transform: isMenuOpen ? 'rotate(45deg) translate(2px, 5px)' : 'none' }}></div>
          <div className="w-6 h-0.5 bg-gray-800 dark:bg-gray-200 mb-1.5 transition-opacity" style={{ opacity: isMenuOpen ? 0 : 1 }}></div>
          <div className="w-6 h-0.5 bg-gray-800 dark:bg-gray-200 transition-transform duration-300 ease-in-out" style={{ transform: isMenuOpen ? 'rotate(-45deg) translate(2px, -5px)' : 'none' }}></div>
        </button>
      </motion.nav>

      {/* Mobile Menu */}
      <div
        className={`fixed top-16 left-0 right-0 bg-white dark:bg-gray-900 shadow-lg z-40 transition-all duration-300 overflow-hidden ${isMenuOpen ? 'max-h-screen' : 'max-h-0'
          }`}
      >
        <div className="px-6 py-4">
          <ul className="flex flex-col gap-4 font-medium">
            {["Home", "About", "Features", "Pricing"].map((item, index) => (
              <li key={index}>
                <Link href={`/${item.toLowerCase()}`} className="block py-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  {item}
                </Link>
                <div className="h-px bg-gray-100 dark:bg-gray-800 mt-2"></div>
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 mt-6">
            <RegisterLink>
              <Button className="w-full bg-white text-blue-600 border border-blue-600 hover:bg-blue-50 dark:bg-gray-800 dark:text-blue-400 dark:hover:bg-gray-700">
                Sign up
              </Button>
            </RegisterLink>

            <LoginLink postLoginRedirectURL="/dashboard">
              <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                Log In
              </Button>
            </LoginLink>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-6 md:px-10 lg:px-20 max-w-7xl mx-auto">
        <motion.div
          className="text-center"
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-6">
            AI THAT WORKS FOR YOUR CAREER
          </h1>

          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
            AI-powered job matching that connects talent with the right opportunities. Upload your resume, get personalized recommendations, and upskill for better career prospects—all in one place.
          </p>

          <motion.div
            className="mt-10 flex flex-wrap justify-center gap-4"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp}>
              <LoginLink postLoginRedirectURL="/dashboard">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </LoginLink>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Button variant="outline" className="rounded-full px-8 py-6 text-lg border-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300">
                Learn More
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            className="mt-8 flex justify-center"
            variants={fadeInUp}
          >
            <a href="#features" className="flex flex-col items-center text-gray-500 hover:text-blue-600 transition-colors cursor-pointer group">
              <span className="mb-2">Scroll for more</span>
              <ChevronDown className="h-6 w-6 animate-bounce" />
            </a>
          </motion.div>
        </motion.div>
      </div>

      {/* Features Highlight */}
      <motion.div
        className="py-10"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={fadeInUp}
        id="features"
      >
        <div className="flex justify-center flex-wrap gap-4 max-w-7xl mx-auto px-6">
          {[
            { icon: "🚀", text: "AI-Powered Matching" },
            { icon: "📊", text: "Real-time Analytics" },
            { icon: "🎯", text: "Targeted Opportunities" },
            { icon: "🔄", text: "Seamless Integration" }
          ].map((feature, index) => (
            <motion.div
              key={index}
              className="bg-white dark:bg-gray-800 shadow-md rounded-xl px-6 py-4 flex items-center gap-3 border border-gray-100 dark:border-gray-700"
              whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)" }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <span className="text-2xl">{feature.icon}</span>
              <span className="font-medium">{feature.text}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Main Content - Cards */}
      <motion.div
        className="flex flex-col items-center md:flex-row justify-center gap-10 mt-10 px-6 max-w-7xl mx-auto"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={staggerContainer}
      >
        <motion.div
          variants={fadeInUp}
          whileHover={{ y: -10, transition: { duration: 0.3 } }}
        >
          <Card
            title="Job Seekers"
            main_image="/images/seeker.png"
            image1="/images/ai.png"
            image2="/images/resume.png"
            image3="/images/goal.png"
            point1="AI-powered job recommendations"
            point2="Resume parsing & skill matching"
            point3="Personalized upskilling courses"
          >
            <LoginLink postLoginRedirectURL="/dashboard">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white py-5 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 font-medium">
                Start Your Job Search
                <ArrowRight className="h-5 w-5" />
              </Button>
            </LoginLink>
          </Card>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          whileHover={{ y: -10, transition: { duration: 0.3 } }}
        >
          <Card
            title="Job Recruiters"
            main_image="/images/recruiter.png"
            image1="/images/ai.png"
            image2="/images/job.png"
            image3="/images/analytics.png"
            point1="AI-Powered Candidate Matching"
            point2="Effortless Job Posting"
            point3="Analytics Dashboard"
          >
            <LoginLink postLoginRedirectURL="/recruiter">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white py-5 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 font-medium">
                Post a Job
                <ArrowRight className="h-5 w-5" />
              </Button>
            </LoginLink>
          </Card>
        </motion.div>
      </motion.div>

      {/* Testimonials Section */}
      <motion.div
        className="py-20 px-6 md:px-10 max-w-7xl mx-auto"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={fadeInUp}
      >
        <h2 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">What Our Users Say</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              name: "Sarah Johnson",
              role: "Software Developer",
              image: "/images/testimonial1.jpg",
              text: "Job Sync AI helped me find a position that perfectly matched my skills. The AI recommendations were spot on!"
            },
            {
              name: "Michael Chen",
              role: "HR Director",
              image: "/images/testimonial2.jpg",
              text: "As a recruiter, this platform has saved us countless hours finding qualified candidates. The analytics dashboard is a game-changer."
            },
            {
              name: "Priya Sharma",
              role: "Marketing Specialist",
              image: "/images/testimonial3.jpg",
              text: "The personalized upskilling courses helped me bridge skill gaps and land my dream job in digital marketing."
            }
          ].map((testimonial, index) => (
            <motion.div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700"
              whileHover={{ y: -5, boxShadow: "0 12px 30px -10px rgba(0, 0, 0, 0.15)" }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden mr-4">
                  {/* This would use actual testimonial images */}
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
                </div>
                <div>
                  <h3 className="font-bold">{testimonial.name}</h3>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-300 italic">{testimonial.text}</p>
              <div className="mt-4 flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Call to Action */}
      <motion.div
        className="py-16 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={fadeInUp}
      >
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Transform Your Career Journey?</h2>
          <p className="text-lg mb-8 text-blue-100">Join thousands of professionals who have discovered their perfect career match with Job Sync AI.</p>

          <div className="flex flex-wrap justify-center gap-4">
            <RegisterLink>
              <Button className="bg-white text-blue-600 hover:bg-blue-50 rounded-full px-8 py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300">
                Create Free Account
              </Button>
            </RegisterLink>

            <Button variant="outline" className="bg-transparent border-2 border-white text-white hover:bg-white/10 rounded-full px-8 py-6 text-lg font-medium">
              Learn More
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Enhanced Footer */}
      <footer className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 pt-16 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src="/images/logo.svg"
                  alt="Job Sync AI Logo"
                  width={40}
                  height={40}
                  className="m-1"
                />
                <h2 className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Job Sync AI
                </h2>
              </div>
              <p className="text-md mb-4">AI-powered job matching platform that connects talent with the right opportunities in an intelligent, personalized way.</p>
              <div className="flex gap-4 mt-4">
                {['twitter', 'facebook', 'linkedin', 'instagram'].map((social) => (
                  <a
                    key={social}
                    href={`https://${social}.com`}
                    className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="sr-only">{social}</span>
                    {/* Replace with actual social icons */}
                    <div className="w-5 h-5 bg-gray-500 rounded-full"></div>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-6">For Job Seekers</h3>
              <ul className="space-y-3">
                {["Browse Jobs", "Upload Resume", "Career Resources", "Skill Assessments", "Learning Paths"].map((item, index) => (
                  <li key={index}>
                    <Link href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-6">For Recruiters</h3>
              <ul className="space-y-3">
                {["Post a Job", "Talent Search", "Analytics Dashboard", "Integration APIs", "Recruitment Tools"].map((item, index) => (
                  <li key={index}>
                    <Link href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold mb-6">Company</h3>
              <ul className="space-y-3">
                {["About Us", "Our Team", "Blog", "Press", "Contact", "Privacy Policy", "Terms of Service"].map((item, index) => (
                  <li key={index}>
                    <Link href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p>© 2025 Job Sync AI. All Rights Reserved.</p>

              <div className="flex gap-6">
                <Link href="/privacy" className="text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Terms of Service
                </Link>
                <Link href="/cookies" className="text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                  Cookie Policy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Page;