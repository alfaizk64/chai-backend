import express from "express";
import { changeCurentPassword, getCurrentUser, getUserChannelprofile, getWatchHistory, loginUser, logout, refreshAccessToken, registerUser, updateAccountDetails, updateuserAvatar, updateuserCoverImage } from "../controllers/user.controller.js";
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
router.get('/getMe',isAuthenticated,getCurrentUser)
router.patch('/updateDetail',isAuthenticated,updateAccountDetails)
router.patch('/updateAvatar',upload.single("avatar"),isAuthenticated,updateuserAvatar)
router.patch('/updateCoverImage',upload.single("coverImage"),isAuthenticated,updateuserCoverImage)
router.post("/changePassword",isAuthenticated,changeCurentPassword)
router.get('/getChannelprofile/:username',isAuthenticated,getUserChannelprofile)
router.get('/getWatchHistory',isAuthenticated,getWatchHistory)

router.post('/logout',isAuthenticated,logout)
export default router;
