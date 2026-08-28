import { Hono } from "hono";
import { requireauth } from "../middleware/requireauth";
import { saveApiKey, listApiKeys, deleteApiKey, validateApiKey } from "../controllers/apikeycontroller";
import { getSettings, updateSettings } from "../controllers/settingscontroller";
import type { Appvariables } from "../index";

const settingsRouter = new Hono<{ Variables: Appvariables }>();

// API Keys
settingsRouter.post("/keys", requireauth, saveApiKey);
settingsRouter.get("/keys", requireauth, listApiKeys);
settingsRouter.delete("/keys/:provider", requireauth, deleteApiKey);
settingsRouter.post("/keys/:provider/validate", requireauth, validateApiKey);

// User settings (system prompt etc.)
settingsRouter.get("/", requireauth, getSettings);
settingsRouter.put("/", requireauth, updateSettings);

export default settingsRouter;
