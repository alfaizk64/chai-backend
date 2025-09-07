import multer from 'multer'
import { v4 as uuidv4 } from "uuid"; // generate unique IDs
import path from "path"

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./Public/temp")
  },
  filename: function (req, file, cb) {
     const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName)
  }
})

export const upload = multer({ storage })

