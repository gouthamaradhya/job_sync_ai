import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";

export default withAuth(
    async function middleware(req: any) {
        return withAuth(req);
    },
    {
        // Middleware still runs on all routes, but doesn't protect the blog route
        publicPaths: ["/", "/api/webhook", "/api/auth/callback/kinde"],

    }

);


export const config = {
    matcher: [
        // Run on everything but Next internals and static files
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    ]
};