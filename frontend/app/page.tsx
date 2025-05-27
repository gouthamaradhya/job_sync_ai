import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import HomeClient from "./HomeClient";


interface user {
  given_name?: string;
  family_name?: string;
  email?: string;
}
export default async function RecruiterPage() {
  const { isAuthenticated } = getKindeServerSession();
  const isUserAuthenticated = await isAuthenticated();
  const { getUser } = getKindeServerSession();
  const user = await getUser();
  const userData: user = {
    given_name: user?.given_name ?? undefined,
    family_name: user?.family_name ?? undefined,
    email: user?.email ?? undefined,
  };

  return <HomeClient user={userData} isAuthenticated={isUserAuthenticated ?? false} />;
}
