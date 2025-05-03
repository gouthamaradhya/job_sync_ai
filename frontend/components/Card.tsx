import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
interface Props {
    title: string;
    main_image: string;
    image1: string;
    image2: string;
    image3: string;
    point1: string;
    point2: string;
    point3: string;
    button: string;

}


const Card: React.FC<Props> = ({ title, main_image, image1, image2, image3, point1, point2, point3, button }) => {
    return (
        <>
            <div className="md:w-1/3 w-5/6 mx-auto md:mx-0 rounded-lg shadow-xl overflow-hidden border border-gray-200 mt-5">
                <h1 className="text-2xl text-center font-bold text-primary">{title}</h1>
                <div className="flex justify-center mt-5">
                    <img src={main_image} alt="main image" className=" w-5/6 h-60" />                </div>
                <div className="mt-5">
                    <div className="flex items-center p-2 gap-2">
                        <Image src={image1} alt="image1" width={50} height={50} />
                        <p className="text-accent">{point1}</p>
                    </div>
                    <div className="flex items-center mt-16 p-2 gap-2">
                        <Image src={image2} alt="image1" width={50} height={50} />
                        <p className="text-accent">{point2}</p>
                    </div>
                    <div className="flex items-center mt-16 p-2 gap-2">
                        <Image src={image3} alt="image1" width={50} height={50} />
                        <p className="text-accent">{point3}</p>
                    </div>
                    <div className="w-full flex justify-center mt-10 mb-5">
                        <Button className=" bg-secondary text-white w-fit hover:bg-secondary-dark">
                            {button}
                        </Button>
                    </div>
                </div>
            </div >

        </>
    )
}

export default Card