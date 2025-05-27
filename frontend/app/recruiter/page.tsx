import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import RecruiterClient from "./RecruiterClient";

interface user {
    given_name?: string;
    family_name?: string;
    email?: string;
}
export default async function RecruiterPage() {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    const userData: user = {
        given_name: user?.given_name ?? undefined,
        family_name: user?.family_name ?? undefined,
        email: user?.email ?? undefined,
    };

    return <RecruiterClient user={userData} />;
}
