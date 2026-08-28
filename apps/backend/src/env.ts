import { auth } from "./lib/auth";

export type Appvariables = {
  user: typeof auth.$Infer.Session.user;
  session: typeof auth.$Infer.Session.session;
};
