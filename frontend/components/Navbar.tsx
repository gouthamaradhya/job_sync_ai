import react from "react";
import Image from "next/image";
interface Props {
    list: string[];
}

const Navbar: React.FC<Props> = ({ list }) => {
    return (
        <>
            <nav className="flex justify-between" >
                <Image src="/images/logo.svg" alt="Logo" width={100} height={100} />
                <ul className="flex justify-between items-center list-none w-1/4 p-2">
                    {list.map(
                        (item, index) =>
                        (<li key={index}>
                            {item}
                        </li>)
                    )}
                </ul>
            </nav>
        </>
    )
}

export default Navbar