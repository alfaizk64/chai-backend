import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_API_SECRET_KEY,
});

export const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    // upload on cloudinary
    const uploadResponse = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file has been uploaded sucessfully
    // console.log("File is uploaded on cloudinary", uploadResponse?.url);
   fs.unlinkSync(localFilePath)
    return uploadResponse;
  } catch (error) {
    fs.unlinkSync(localFilePath)
    // removed local savewtemp file 
  }
};
