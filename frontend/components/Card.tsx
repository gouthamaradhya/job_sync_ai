"use client"

import React from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CardProps {
  title: string;
  main_image: string;
  image1: string;
  image2: string;
  image3: string;
  point1: string;
  point2: string;
  point3: string;
  button?: string;
  children?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ 
  title, 
  main_image, 
  image1, 
  image2, 
  image3, 
  point1, 
  point2, 
  point3, 
  button, 
  children 
}) => {
  const router = useRouter();
  
  const handleButtonClick = () => {
    if (button === "Post a Job") {
      router.push("/recruiterdashboard?tab=post-job");
    } else if (button === "Start Your Job Search") {
      router.push("/jobseekerdashboard");
    }
  };

  return (
    <div className="w-96 p-4 rounded-md shadow-md bg-white dark:bg-gray-800 mb-10">
      <h2 className="text-xl font-bold text-center">{title}</h2>
      <div className="flex justify-center my-4">
        <Image src={main_image} alt={title} width={250} height={250} />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <Image src={image1} alt="Feature Icon" width={30} height={30} />
        <p>{point1}</p>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <Image src={image2} alt="Feature Icon" width={30} height={30} />
        <p>{point2}</p>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <Image src={image3} alt="Feature Icon" width={30} height={30} />
        <p>{point3}</p>
      </div>
      <div className="flex justify-center">
        {children ? (
          children
        ) : button ? (
          <Button 
            className="bg-[#F26430] hover:bg-[#d55a2b] text-white"
            onClick={handleButtonClick}
          >
            {button}
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default Card;