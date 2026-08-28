import { Hono } from 'hono'
import 'dotenv/config';
import { cors } from 'hono/cors';
import { auth } from './lib/auth';
import { requireauth } from './middleware/requireauth';
import notesRouter from "./routes/noteroute";
import foldersRouter from "./routes/folderroute";
import templatesRouter from "./routes/templateroute";
import chatRouter from "./routes/chatsroutes";
import settingsRouter from "./routes/settingsroute";
import aiRouter from "./routes/airoute";
import videoRouter from "./routes/videoroute";

// Re-export db so controllers that `import { db } from ".."` still work
export { db } from './lib/db';

// Extend Hono's context type so c.get("user") is typed and access  relevant docs to set this up i used docs  in https://better-auth.com/docs/integrations/hono 
export type Appvariables = {
  user: typeof auth.$Infer.Session.user;
  session: typeof auth.$Infer.Session.session;
};

const app = new Hono<{ Variables: Appvariables }>();
app.use(
	"*", 
	cors({
		origin: [
      process.env.FRONTEND_URL ?? "http://localhost:3001",
      'http://tauri.localhost',     // Tauri Windows App
      'tauri://localhost'           // Tauri Mac/Linux App
    ],
		allowHeaders: ["Content-Type", "Authorization"],
		allowMethods: ["POST", "GET","PUT","PATCH","DELETE", "OPTIONS"],
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => {
	return auth.handler(c.req.raw);
});

app.get('/', (c) => {
  return c.text('foldex backend is running !')
})

app.get('/me',requireauth, async(c)=>{
   const user = c.get("user")
   const session = c.get("session")

   return c.json({user:user,session:session}) 
})

app.route('/api/notes',notesRouter);
app.route('/api/folders',foldersRouter);
app.route('/api/templates',templatesRouter);
app.route('/api/chats',chatRouter);
app.route('/api/settings',settingsRouter);
app.route('/api/ai',aiRouter);
app.route('/api/videos',videoRouter);

export type AppType = typeof app;
export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
  idleTimeout: 255, // 255 seconds (max for Bun) to allow long LLM requests to finish
};
