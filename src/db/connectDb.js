import mongoose from "mongoose";
import {DB_NAME} from "../constants.js"


export const conenctDB = async ()=>{
        try {
           const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)            
                 console.log(`\n MongoDb Connected !! DB HOST: ${connectionInstance.connection.host}`);
                 
        } catch (error) {
            console.error("MongoDb Connection Failed",error);
            process.exit(1)
        }
}