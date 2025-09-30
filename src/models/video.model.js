import mongoose, { model } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new mongoose.Schema({

        videoFile:{
              type:String,
              required:[true,"Video must be required "]
        },
        thumbnail:{
             type:String,
              required:[true,"Thumbnail must be required "]
        },
        duration:{
             type:Number,
              required:[true]

        },
        title:{
             type:String,
              required:[true,"Title must be required "]
        },
        description:{
             type:String,
              required:[true,"Description must be required "]
        },
        views:{
            type:Number,
            default:0
        },
        isPublished:{
            type:Boolean,
            required:true
        },
        publisher:{
            type:mongoose.Schema.Types.ObjectId,
            ref:User
        }


},{timestamps:true})

videoSchema.plugin(mongooseAggregatePaginate)
export const Video = mongoose.model("Video",videoSchema) 