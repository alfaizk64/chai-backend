import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"
import validator from "validator";
import isEmail from "validator/lib/isEmail";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      minlength: [3, "Full name must be at least 3 characters long"],
      maxlength: [15, "Full name must not exceed 15 characters"],
      match: [/^[a-zA-Z\s]+$/, "Full name can only contain letters and spaces"],
    },
    email: {
      type: String,
      required: true,
      unique: [true, "Email is Already is in use"],
      lowercase: true,
      trim: true,
      validate:{
        validator:validator.isEmail,
        message:"Please Provide a valid Email"
      }
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: [3, "Full name must be at least 3 characters long"],
      maxlength: [15, "Full name must not exceed 15 characters"],
      match: /^[a-zA-Z\s]+$/,
      message: "Full name can only contain letters and spaces",
      index: true,
    },
    avatar: {
      type: String, // cloudinaryURl
      required: true,
    },
    coverImage: {
      type: String,
    },
    watchHistory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Pasword is required"],
      trim: true,
      minlength: [8, "Password must be at least 8 characters"],
      validate: {
      validator: (value) => validator.isStrongPassword(value, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
      }),
      message: "Password must be stronger (include upper, lower, number, and symbol)",
    },
    },
    refreshToken:{
        type:String
    }
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next){
    if(!this.isModified("password")) return next();
          this.password = await bcrypt.hash(this.password, 10)       
     next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
   return await bcrypt.compare(password,this.password)
}

// Generate JWT Access Token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { _id: this._id, email: this.email, username: this.username },
    process.env.ACCESS_TOKEN_SECRET,
     { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "6h" }
  );
};

// Generate JWT Refresh Token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
     { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "10d" }
  );
};


export const User = mongoose.model("User", userSchema);
