import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import validator from "validator";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

export const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullName, password, confirmPassword } = req.body;
  // to check every field are proper or not
  if (
    !username?.trim() ||
    !email?.trim() ||
    !fullName?.trim() ||
    !password?.trim() ||
    !confirmPassword?.trim()
  ) {
    throw new ApiError(400, "All fields are required");
  }

  //   second method for doing this is
  // if ([username, fullName, password, email, confirmPassword].some((field) => !field || field.trim() === "")) {
  //   throw new ApiError(400, "All fields are required");
  // }

  if (!validator.isEmail(email)) {
    throw new ApiError(403, "Please Enter a valid Email Address");
  }
  if (!validator.isLength(fullName, { min: 3, max: 20 })) {
    throw new ApiError(403, "Name should be between 3 and 8 characters long");
  }
  if (
    !validator.matches(
      password,
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    )
  ) {
    throw new ApiError(
      400,
      "Password should be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    );
  }
  if (password !== confirmPassword) {
    throw new ApiError(403, "Password do not matched");
  }
  //  checkfor existing user or not
  // 5️⃣ Check if user exists
//   const existingUser = await User.findOne({
//     $or: [{ email }, { username }],
//   });

//   if (existingUser) {
//     if (existingUser.email === email) {
//       throw new ApiError(409, "Email is already registered");
//     }
//     throw new ApiError(409, "Username is already taken");
//   }

  const emailExists = await User.findOne({ email });
  if (emailExists) {
    throw new ApiError(409, "Email is already registered");
  }

  const usernameExists = await User.findOne({ username });
  if (usernameExists) {
    throw new ApiError(409, "Username is already taken");
  }
  const avatarLocalPath = req?.files?.avatar[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avtar file is required");
  }
  const coverImageLocalPath = req?.files?.coverImage[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avtar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar?.url,
    username,
    password,
    coverImage: coverImage?.url || "",
    email,
  });
//   const newUser = await User.findById(user._id).select(
//     "-refreshToken password"
//   );
     
       // remove sensitive fields directly
const newUser = user.toObject();
delete newUser.password;
delete newUser.refreshToken;
      if(!newUser){
        throw new ApiError(500,"Something went wrong while registering the user")
      }

           
       return res.status(201).json(
        new ApiResponse(200,newUser,"user Created Successfully")
       )
});
