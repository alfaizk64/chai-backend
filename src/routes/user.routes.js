import express from "express";
import { loginUser, logout, refreshAccessToken, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { isAuthenticated } from "../middlewares/authentication.middleware.js";

const router = express.Router();

router.post(
  "/register",
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.post('/login',loginUser)
router.post("/refresh-access-token",refreshAccessToken)

// scured routes

router.post('/logout',isAuthenticated,logout)
export default router;
