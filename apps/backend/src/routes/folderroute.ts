import { Hono } from "hono";
import { Variables } from "hono/types";
import { requireauth } from "../middleware/requireauth";
import { createfolder, deletefolder, getfolderbyid, getusersfolders, updatefolder } from "../controllers/foldercontroller";
import { Appvariables } from "..";


const router = new Hono<{ Variables: Appvariables }>();

router.use('*',requireauth);

router.get("/",getusersfolders);
router.get("/:id",getfolderbyid);
router.post("/",createfolder);
router.put('/:id',updatefolder);
router.delete('/:id',deletefolder);

export default router