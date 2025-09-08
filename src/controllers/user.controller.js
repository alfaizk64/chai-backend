import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import validator from "validator";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { validate } from "uuid";

// generate access and refresh tokens
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });  //validate before save is used just for not invoking password hashing which is used using pre middleware 

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

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
  // 5️ Check if user exists
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

  const avatarLocalPath = req?.files?.avatar?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avtar file is required");
  }

  const coverImageLocalPath = req?.files?.coverImage?.[0]?.path || null;
  //   if (!coverImageLocalPath) {
  //     throw new ApiError(400, "cover file is required");
  //   }
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required Not Uploaded to Cloud!!");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

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
  if (!newUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, newUser, "user Created Successfully"));
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if ((!email && !username) || !password) {
    throw new ApiError(400, "Email/Username and password are required");
  }

  // Find user either by email or username
  const userExistance = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!userExistance) {
    throw new ApiError(
      404,
      "No user found with this email/username. Please register or sign up first."
    );
  }

  // Validate password (assuming you have a method comparePassword in schema)
  const isValidPassword = await userExistance.isPasswordCorrect(password);

  if (!isValidPassword) {
    throw new ApiError(401, "Invalid credentials. Please try again.");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    userExistance._id
  );

  const sanitizeUser = (user) => {
    const newUser = user.toObject();
    (delete newUser.password, delete newUser.refreshToken);
    return newUser;
  };
  const sanitized = sanitizeUser(userExistance);

  return res
    .status(200)
    .cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 6 * 60 * 60 * 1000,
    })
    .cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json(
      new ApiResponse(
        200,
        {
          user: sanitized,
        },
        "User logged In Successfully"
      )
    );
});
export const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user?.id,
    {
      $set: {
        refreshToken: "",
      },
    },
    {
      new: true,
    }
  );
  return res
    .status(200)
    .clearCookie("accessToken", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    })
    .clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    })
    .json(new ApiResponse(200, {},"user logout Successfully"));
});
