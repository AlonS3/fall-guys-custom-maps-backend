const mongoose = require("mongoose")
const User = require("../models/userModel")
const Map = require("../models/mapModel")
const MapLike = require("../models/mapLikeModel")
const { validateUpdateUserInformation, validateUserIdParams } = require("../utils/validator")

exports.getUser = async (req, res) => {
  const { error: paramsError } = validateUserIdParams(req.params)

  if (paramsError) {
    return res.status(400).json({ error: "Invalid user id." })
  }

  const { userId } = req.params

  try {
    const user = await User.findById(userId)
      .select("nickname status photo maps")
      .populate({
        path: "maps",
        model: "Map",
        select: "title description code category images likesCount creator createdAt",
        populate: {
          path: "creator",
          select: "nickname _id",
          model: "User",
        },
      })

    if (!user) {
      return res.status(404).json({ error: "User not found." })
    }
    const userResponse = user.toObject()

    let likedMapIds
    if (req.user) {
      const mapsIds = userResponse.maps.map((map) => map._id)
      // Find all likes by the current user for these posts
      const likes = await MapLike.find({
        user: req.user._id,
        map: { $in: mapsIds },
      })
      // Convert likes to a set of post IDs for easier checking
      likedMapIds = new Set(likes.map((like) => like.map.toString()))
    }

    const responseMaps = [...userResponse.maps].map((map) => {
      const mapJson = { ...map }
      mapJson.images = mapJson.images.map((imageName) => process.env.CLOUDFRONT_DOMAIN + imageName)
      if (likedMapIds) {
        mapJson.isLikedByCurrentUser = likedMapIds.has(map._id.toString())
      } else {
        mapJson.isLikedByCurrentUser = false
      }
      return mapJson
    })
    userResponse.maps = responseMaps
    res.status(200).json(userResponse)
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: "Fetching user failed, please try again." })
  }
}

exports.getUserProfile = async (req, res) => {
  const userId = req.user._id

  try {
    const user = await User.findById(userId).select("nickname status photo email displayName")

    if (!user) {
      return res.status(404).json({ error: "User not found." })
    }
    const likes = await MapLike.find({
      user: req.user._id,
    })
      .sort({ createdAt: -1 })
      .select("map createdAt")
      .populate({
        path: "map",
        model: "Map",
        select: "title description code category images likesCount creator createdAt",
        populate: {
          path: "creator",
          select: "nickname _id",
          model: "User",
        },
      })
    const userResponse = user.toObject()
    userResponse.likedMaps = likes.map((like) => {
      const likeJson = like.toObject()
      likeJson.map.isLikedByCurrentUser = true
      likeJson.map.images = likeJson.map.images.map((imageName) => process.env.CLOUDFRONT_DOMAIN + imageName)
      return likeJson
    })

    res.status(200).json(userResponse)
  } catch (err) {
    console.log(err)
    return res.status(500).json({ error: "Fetching user failed, please try again." })
  }
}

exports.deleteUser = async (req, res) => {
  // Check if user exists
  const userExists = await User.exists({ _id: req.user._id })
  if (!userExists) {
    return res.status(404).json({ error: "User not found" })
  }

  const sessionCollection = mongoose.connection.collection("sessions")
  const session = await mongoose.startSession()
  let allImageKeys = []

  try {
    // Start a transaction
    session.startTransaction()

    // Fetch all the likes associated with the user
    const userLikes = await MapLike.find({ user: req.user._id }, { session })

    // Gather all map IDs the user has liked
    const likedMapIds = userLikes.map((userLike) => userLike.map)

    // Decrement the likesCount for all maps the user has liked
    await Map.updateMany({ _id: { $in: likedMapIds } }, { $inc: { likesCount: -1 } }, { session: session })

    // Delete all the likes associated with the user
    await MapLike.deleteMany({ user: req.user._id }, { session })

    // Find the user's maps
    const userMaps = await Map.find({ creator: req.user._id }, { session })

    // Gather all image keys
    for (let userMap of userMaps) {
      allImageKeys.push(...userMap.images)
    }

    // Delete the user's maps
    await Map.deleteMany({ creator: req.user._id }, { session })

    // Delete the user
    await User.deleteOne({ _id: req.user._id }, { session })

    // Delete all sessions associated with the user within the transaction
    await sessionCollection.deleteMany({ "session.passport.user": req.user._id.toString() }, { session })

    // Commit the transaction
    await session.commitTransaction()
  } catch (error) {
    // There was an error with the database operations
    res.status(500).json({ error: "Error deleting account" })
    await session.abortTransaction()
    return // Exit the function to prevent further processing
  } finally {
    // End the session
    session.endSession()
  }

  // Delete the images from s3
  await rollbackS3Uploads(allImageKeys)

  // Respond with a success message regardless of S3 outcome
  res.json({ message: "User account and associated maps deleted successfully" })
}

exports.updateUserInformation = async (req, res) => {
  const { error, value } = validateUpdateUserInformation(req.body)

  if (error) {
    return res.status(400).json({ error: "Invalid inputs passed, please check your data." })
  }

  // The keys in this object correspond to the fields that can be updated
  const updateFields = { nickname: value.nickname, status: value.status }

  // Remove undefined fields
  Object.keys(updateFields).forEach((key) => (updateFields[key] === undefined ? delete updateFields[key] : {}))

  try {
    // If the user is authorized, proceed with the update
    const updatedUser = await User.findByIdAndUpdate(req.user._id, { $set: updateFields }, { new: true, useFindAndModify: false })

    res.status(200).json({ message: "User information updated successfully.", user: updatedUser })
  } catch (err) {
    return res.status(500).json({ error: "Updating user information failed, please try again." })
  }
}
