import React from "react";
import Image from "next/image";
import Link from "next/link";

interface Props {
    list: string[];
}

const Navbar: React.FC<Props> = ({ list }) => {
    return (
        <>
            <nav className="flex justify-between shadow-md px-4 py-2 bg-[#9CAFB7] dark:bg-gray-800" >
                <div className="flex items-center gap-2">
                    <Image src="/images/logo.svg" alt="Logo" width={50} height={50} />
                    <span className="font-bold text-xl">Job Sync AI</span>
                </div>
                <ul className="flex justify-end items-center gap-6 list-none p-2">
                    {list.map(
                        (item, index) =>
                        (<li key={index} className="hover:text-gray-200 transition-colors">
                            <Link href={`/${item.toLowerCase()}`}>
                                {item}
                            </Link>
                        </li>)
                    )}
                </ul>
            </nav>
        </>
    )
}

export default Navbar