import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import DashboardClient from "./DashboardClient";

type User = {
    given_name?: string;
    family_name?: string;
    email?: string;
};

export default async function DashboardPage() {
    const { getUser } = getKindeServerSession();
    const user = await getUser();
    const userData: User = {
        given_name: user?.given_name ?? undefined,
        family_name: user?.family_name ?? undefined,
        email: user?.email ?? undefined,
    };

    return <DashboardClient user={userData} />;
}
