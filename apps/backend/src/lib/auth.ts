import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "../db/schema"
import { db } from "./db";
import { emailOTP } from "better-auth/plugins";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);


export const auth = betterAuth({
  database:drizzleAdapter(db,{
    provider:"pg",
    schema:{
        user:schema.user,
        session:schema.session,
        account:schema.account,
        verification:schema.verification
    }
  }),
  plugins:[
    emailOTP({
        async sendVerificationOTP({email,otp,type}){
        await resend.emails.send({
          from: "foldex <noreply@foldex.space>",
          to: email,
          subject: type === "sign-in" ? "Your foldex sign-in code" : "Verify your foldex account",
          html: `
            <div style="font-family:sans-serif;max-width:400px;margin:0 auto">
              <h2>Your one-time code</h2>
              <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1F4E79">${otp}</p>
              <p style="color:#666">This code expires in 10 minutes. Do not share it.</p>
            </div>
          `,
        });
      },
      expiresIn: 600, // 10 minutes
      otpLength: 6,
    }),
  ],
  trustedOrigins: [
    process.env.FRONTEND_URL ?? "http://localhost:3001",
    'http://tauri.localhost',     // Tauri Windows App
    'tauri://localhost'           // Tauri Mac/Linux App
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // refresh if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
},
advanced:{
  crossSubDomainCookies:{
    enabled: true,
    domain: ".foldex.space",
  },
  defaultCookieAttributes: {
      sameSite: "none", 
      secure: true, 
  }
}
});

export type Auth = typeof auth;