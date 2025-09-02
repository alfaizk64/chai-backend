import dotenv from "dotenv"
import { conenctDB } from "./db/connectDb.js";

dotenv.config({
    path:'./.env'
})


conenctDB()
























// import express from "express"
// const aap = express()

// ( async()=>{
//     try {
//        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//        aap.on("error",(error)=>{
//         console.log("Error",error);
//         throw error         
//        })
      
//        app.listen(process.env.PORT,()=>{
//                console.log(`App is kistening on Port ${process.env.PORT}`);
               
//        })


//     } catch (error) {
//         console.error("Error",error);
//         throw err
//     }
// })()