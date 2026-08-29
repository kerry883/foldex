import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";


export const authClient = createAuthClient({
    baseURL: import.meta.env.VITE_API_URL ?? "https://api.foldex.space",
    plugins:[
        emailOTPClient()
    ]
})

//not needed you can access this using the authclient. this is for convience
export const {useSession,signOut}=authClient;