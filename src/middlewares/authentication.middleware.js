import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const isAuthenticated = asyncHandler(async (req, _ , next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      throw new ApiError(401, "Unauthorized Request. Access token Is Missing!!");
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    // console.log(decoded);

    req.user = {id:decoded._id};
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Access token invalid or expired");
  }
});
