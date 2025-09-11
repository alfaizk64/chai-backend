import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    subscriber: {
      type: mongoose.Schema.Types.ObjectId, // one who is subscribing
      ref: "User",
    },

    channel: {
      type: mongoose.Schema.Types.ObjectId, // one who is subscribing to channel
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);



//  if we have to count any channel subscriber count than we will select all those document in which we hae channel chai or code 
// we willnotcount subscriber we will see all those document who have channel chai or code or any xyz channel