import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import validator from "validator";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  deleteMediaFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";

// generate access and refresh tokens
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false }); //validate before save is used just for not invoking password hashing which is used using pre middleware

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
          refreshToken,
          accessToken,
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
    .json(new ApiResponse(200, {}, "user logout Successfully"));
});

// refreshToken controller
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const userRefresToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!userRefresToken) {
    throw new ApiError(401, "unathorized request");
  }
  try {
    const decodedRefreshtoken = jwt.verify(
      userRefresToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedRefreshtoken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }
    if (userRefresToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }
    const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
      user._id
    );

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
            refreshToken,
            accessToken,
          },
          "New Access Token Generated Successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error.message || "Invalid Refres Token ");
  }
});

export const changeCurentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?.id);
  const isPaswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPaswordCorrect) {
    throw new ApiError(400, "Invalid Old Password");
  }
  user.password = newPassword;
  await user.save();
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password reset successfully"));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user?.id);
  const sanitizeUser = (user) => {
    const newUser = user.toObject();
    (delete newUser.password, delete newUser.refreshToken);
    return newUser;
  };
  const sanitized = sanitizeUser(user);
  return res
    .status(200)
    .json(
      new ApiResponse(200, { user: sanitized }, "User fetched successfuly")
    );
});

export const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?.id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true, runValidators: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated Successfully"));
});

// update user avatar
export const updateuserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const user = await User.findById(req.user?.id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(404, "user not found");
  }
  if (user?.avatar) {
    const publicId = user.avatar.split("/").pop().split(".")[0];
    await deleteMediaFromCloudinary(publicId);
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while upoading avatar");
  }

  // const user =  await User.findByIdAndUpdate(
  //     req.user?.id,
  //     {
  //       $set: {
  //         avatar: avatar.url,
  //       },
  //     },
  //     { new: true }
  //   ).select("-password -refreshToken");

  user.avatar = avatar.url;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});

// update coverImage
export const updateuserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "CoverImage file is missing");
  }
  const user = await User.findById(req.user?.id).select(
    "-password -refreshToken"
  );

  if (!user) {
    throw new ApiError(404, "user Not found");
  }

  if (user?.coverImage) {
    const publicId = user.coverImage.split("/").pop().split(".")[0];
    await deleteMediaFromCloudinary(publicId);
  }

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while upoading CoverImage");
  }

  // const user =  await User.findByIdAndUpdate(
  //     req.user?.id,
  //     {
  //       $set: {
  //         coverImage: coverImage.url,
  //       },
  //     },
  //     { new: true }
  //   ).select("-password -refreshToken");
  user.coverImage = coverImage.url;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, user, "CoverImage updated successfully"));
});



export const getUserChannelprofile = asyncHandler(async (req, res) => {
     const {username} = req.params;
     if(!username?.trim()){
        throw new ApiError(400,"Username is required")
     }

      // const user = await User.find({username}).select("-password -refreshToken")
     const channel = await User.aggregate([
        {
          $match: { 
            username: username?.toLowerCase()
          },
        
        },
        {
          $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
          }
        },
        {
          $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribedTo"
          }
        },
        {
          $addFields:{
            subscribersCount:{$size:"$subscribers"},
            subscribedToCount:{$size:"$subscribedTo"},
           
             isSubscribed:{
              $cond:{
                if:{$in:[req.user?.id,"$subscribers.subscriber"]},
                then:true,
                else:false    
              }
             }
          }
        },
        {
          $project:{
            fullName:1,
            username:1,
            subscribersCount:1,
            subscribedToCount:1,
            isSubscribed:1,
            avatar:1,
            coverImage:1,
            email:1,
            createdAt:1, 
          }
        }
      ])

      if (channel?.length === 0) {
        throw new ApiError(404, "Channel not found");
      }
      return res.status(200).json(new ApiResponse(200,channel[0],"Channel Fetched Successfully"))
});

export const getWatchHistory =  asyncHandler(async (req, res) => {
       const user = await User.aggregate([
        {
          $match:{
            _id: new mongoose.Types.ObjectId(req.user?.id)
          }
        },
        {
         $lookup:{
          from:"videos",
          localField:"watchHistory",
          foreignField:"_id",
          as:"watchHistory",
          pipeline:[
            {
              $lookup:{
                from:"users",
                localField:"publisher",
                foreignField:"_id",
                as:"publisher",
                pipeline:[
                  {
                    $project:{
                      fullName:1,
                      username:1,
                      avatar:1
                    }
                  }
                ]
              }
            },
            {
              $addFields:{
                 publisher:{
                  $first:"$publisher"
                 }
              }
            }
          ]
         } 
        }
       ])


        return res.status(200).json(new ApiResponse(200,user[0]?.watchHistory || [],"Watch History Fetched Successfully"))
})