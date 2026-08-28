import { Hono } from "hono";
import { Variables } from "hono/types";
import { requireauth } from "../middleware/requireauth";
import { addmessage, createchat, deletechat, fetchchats, getchat, updatechat } from "../controllers/chatscontroller";
import { Appvariables } from "..";



const router = new Hono<{Variables:Appvariables}>();

router.use("*",requireauth);

router.get('/',fetchchats);
router.post('/',createchat);
router.get('/:id',getchat);
router.put('/:id',updatechat);
router.delete('/:id',deletechat);
router.post('/:id/messages',addmessage);

export default router;
