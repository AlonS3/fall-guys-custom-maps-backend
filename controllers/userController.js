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
  const session = await mongoose.startSession()

  try {
    // Start a transaction

    session.startTransaction()

    // Find the user's maps
    const userMaps = await Map.find({ creator: req.user._id }, { session })

    // Delete the user's maps
    await Map.deleteMany({ creator: req.user._id }, { session })

    // Remove the user's maps from the likedMaps array of all users who liked them
    for (let userMap of userMaps) {
      await User.updateMany(
        { likedMaps: userMap._id },
        { $pull: { likedMaps: userMap._id } },
        { session: session, multi: true, useFindAndModify: false }
      )
    }

    // Delete the user
    await User.deleteOne({ _id: req.user._id }, { session })

    // Commit the transaction
    await session.commitTransaction()

    // Clear JWT cookie
    res.clearCookie("jwt")

    // Respond with a success message
    res.json({ message: "User account and associated maps deleted successfully" })
  } catch (error) {
    // There was an error deleting the account
    res.status(500).json({ error: "Error deleting account" })
    await session.abortTransaction()
  } finally {
    // End the session
    session.endSession()
  }
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
