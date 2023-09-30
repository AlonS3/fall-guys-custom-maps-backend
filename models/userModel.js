const mongoose = require("mongoose")
const passportLocalMongoose = require("passport-local-mongoose")
const findOrCreate = require("mongoose-findorcreate")

const User = new mongoose.Schema({
  nickname: {
    type: String,
    required: true,
  },
  isCustomName: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    default: "",
  },
  googleId: {
    type: String,
    required: true,
    unique: true,
  },
  provider: {
    type: String,
    required: true,
  },
  displayName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    lowercase: true,
    unique: true,
    required: [true, "can't be blank"],
    match: [/\S+@\S+\.\S+/, "is invalid"],
    index: true,
  },
  photo: {
    type: String,
  },
  maps: { type: [{ type: mongoose.Types.ObjectId, ref: "Map" }] },
})

User.index(
  { nickname: 1 },
  {
    unique: true,
    partialFilterExpression: { isCustomName: true },
  }
)

User.plugin(findOrCreate)
User.plugin(passportLocalMongoose, { usernameField: "email" })

module.exports = mongoose.model("User", User)
