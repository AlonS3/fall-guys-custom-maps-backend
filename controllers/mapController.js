const mongoose = require("mongoose")
const Map = require("../models/mapModel")
const User = require("../models/userModel")
const MapLike = require("../models/mapLikeModel")
const { validateCreateMap, validateUpdateMap, validateMapIdParams, validateMapQuery } = require("../utils/validator")
const optimizeImages = require("../utils/sharpImageOptimization")
const { uploadToS3, rollbackS3Uploads } = require("../utils/s3-functions")
const { createMapDBTransaction } = require("../utils/db-functions")
require("dotenv/config")

exports.getMap = async (req, res) => {
  const { error: paramsError } = validateMapIdParams(req.params)

  if (paramsError) {
    return res.status(400).json({ error: "Invalid map id." })
  }

  const { mapId } = req.params

  try {
    const map = await Map.findById(mapId).populate({
      path: "creator",
      select: "nickname _id",
      model: "User",
    })

    if (!map) {
      return res.status(404).json({ error: "Map not found." })
    }

    // Prepare a response object that includes a 'likesCount' property instead of the 'likes' array
    const responseMap = map.toObject() // Convert the Mongoose document to a plain JavaScript object
    responseMap.userLiked = false
    if (req.user) {
      try {
        let like = await MapLike.findOne({
          user: req.user._id,
          map: mapId,
        })
        if (like) {
          responseMap.userLiked = true
        }
      } catch (err) {}
    }
    res.status(200).json(responseMap)
  } catch (err) {
    res.status(500).json({ error: "Fetching map failed, please try again." })
  }
}

exports.createMap = async (req, res, next) => {
  const { error, value } = validateCreateMap(req.body)
  const { files } = req

  if (error || !files?.length) {
    return res.status(422).json({ error: "Invalid inputs passed, please check your data." })
  }

  const optimizedFiles = await optimizeImages(files)
  const successfulUploads = await uploadToS3(optimizedFiles)

  if (successfulUploads.length === 0) {
    return res.status(400).json({ error: "No images were uploaded successfully." })
  }
  const uploadsFullLinks = successfulUploads.map((fileName) => process.env.CLOUDFRONT_DOMAIN + fileName)

  const createdMap = new Map({
    title: value.title,
    description: value.description,
    code: value.code,
    category: value.category,
    images: successfulUploads,
    creator: req.user._id.toString(),
  })
  const dbResult = await createMapDBTransaction(createdMap, req.user._id)

  if (dbResult.success) {
    const map = { ...dbResult.map.toObject(), images: uploadsFullLinks }
    res.status(201).json({ map })
  } else {
    await rollbackS3Uploads(successfulUploads)
    if (dbResult.error.code === 11000) {
      return res.status(409).json({ error: "A map with this code already exists." })
    }
    console.log(dbResult.error)
    return res.status(500).json({ error: "Creating place failed, please try again." })
  }
}

exports.likeMap = async (req, res, next) => {
  const { error: paramsError } = validateMapIdParams(req.params)
  if (paramsError) {
    return res.status(400).json({ error: "Invalid map id." })
  }

  const { mapId } = req.params

  try {
    // Find the map
    const map = await Map.findById(mapId).exec()

    // If no map is found, send a 404 error
    if (!map) {
      return res.status(404).json({ error: "Map not found." })
    }
  } catch (err) {
    return res.status(500).json({ error: "Fetching map failed, please try again." })
  }

  const session = await mongoose.startSession()
  try {
    session.startTransaction()
    const like = new MapLike({ user: req.user._id, map: mapId })
    await like.save({ session: session })
    // Also update the post's totalLikes
    await Map.updateOne({ _id: mapId }, { $inc: { likesCount: 1 } }, { session: session })
    await session.commitTransaction()
    res.status(201).json({ like: true, message: "Map liked successfully." })
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error code in MongoDB
      res.status(400).json({ message: "You have already liked this post" })
    } else {
      res.status(500).json({ message: "Something went wrong" })
    }
    await session.abortTransaction()
  } finally {
    session.endSession()
  }
}

exports.unlikeMap = async (req, res, next) => {
  const { error: paramsError } = validateMapIdParams(req.params)
  if (paramsError) {
    return res.status(400).json({ error: "Invalid map id." })
  }

  const { mapId } = req.params

  try {
    // Find the map
    const map = await Map.findById(mapId).exec()

    // If no map is found, send a 404 error
    if (!map) {
      return res.status(404).json({ error: "Map not found." })
    }
  } catch (err) {
    return res.status(500).json({ error: "Fetching map failed, please try again." })
  }

  const session = await mongoose.startSession()
  try {
    session.startTransaction()
    const like = await MapLike.findOneAndDelete({ user: req.user._id, map: mapId }, { session: session })
    if (!like) {
      return res.status(400).json({ message: "Map is not liked." })
    }
    // Decrement the post's totalLikes
    await Map.updateOne({ _id: mapId }, { $inc: { likesCount: -1 } }, { session: session })
    await session.commitTransaction()
    res.status(200).json({ like: false, message: "Map unliked successfully." })
  } catch (err) {
    res.status(500).json({ error: "Unliking map failed, please try again." })
    await session.abortTransaction()
  } finally {
    session.endSession()
  }
}

exports.updateMap = async (req, res, next) => {
  const { error: paramsError } = validateMapIdParams(req.params)

  const { error: bodyError, value } = validateUpdateMap(req.body)

  if (paramsError || bodyError) {
    return res.status(400).json({ error: "Invalid inputs passed, please check your data." })
  }

  const { mapId } = req.params
  const { title, description, category, images } = value

  // The keys in this object correspond to the fields that can be updated
  const updateFields = { title, description, category, images }

  // Remove undefined fields
  Object.keys(updateFields).forEach((key) => (updateFields[key] === undefined ? delete updateFields[key] : {}))

  try {
    // Find the map
    const map = await Map.findById(mapId).exec()

    // If no map is found, send a 404 error
    if (!map) {
      return res.status(404).json({ error: "Map not found." })
    }

    // Check if the authenticated user is the creator of the map
    if (map.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "User not authorized to update this map." })
    }

    // If the user is authorized, proceed with the update
    const updatedMap = await Map.findByIdAndUpdate(mapId, { $set: updateFields }, { new: true, useFindAndModify: false })

    res.status(200).json({ message: "Map updated successfully.", map: updatedMap })
  } catch (err) {
    return res.status(500).json({ error: "Updating map failed, please try again." })
  }
}

exports.deleteMap = async (req, res, next) => {
  const { error: paramsError } = validateMapIdParams(req.params)

  if (paramsError) {
    return res.status(400).json({ error: "Invalid map id." })
  }

  const { mapId } = req.params
  let map // Define map here

  try {
    // Find the map
    map = await Map.findById(mapId).exec()

    // If no map is found, send a 404 error
    if (!map) {
      return res.status(404).json({ error: "Map not found." })
    }
  } catch (err) {
    return res.status(500).json({ error: "Deleting map failed, please try again." })
  }

  // Check if the authenticated user is the creator of the map
  if (map.creator.toString() !== req.user._id.toString()) {
    return res.status(403).json({ error: "User not authorized to delete this map." })
  }

  // If the user is authorized, proceed with the deletion

  //deletes s3 pictures
  const s3Results = await rollbackS3Uploads(map.images)
  if (!s3Results) {
    return res.status(500).json({ error: "Deleting map failed, please try again." })
  }

  // Start session
  const session = await mongoose.startSession()

  try {
    session.startTransaction()

    // First remove the map from the user's maps array
    await User.findByIdAndUpdate(req.user._id, { $pull: { maps: mapId } }, { session: session, new: true, useFindAndModify: false })

    // Also delete all likes associated with this post
    await MapLike.deleteMany({ map: mapId })

    // Delete all comments associated with this post
    // await Comment.deleteMany({ map: mapId });

    // Then delete the map
    await Map.findByIdAndRemove(mapId, { session: session, useFindAndModify: false })

    await session.commitTransaction()

    res.status(200).json({ message: "Map deleted successfully." })
  } catch (error) {
    res.status(500).json({ error: "Deleting map failed, please try again." })
    await session.abortTransaction()
  } finally {
    session.endSession()
  }
}

exports.getMaps = async (req, res) => {
  const { error: paramsError } = validateMapQuery(req.query)

  if (paramsError) {
    console.log(paramsError)
    return res.status(400).json({ error: "Invalid Parameters" })
  }

  try {
    const limit = 10
    const { category = "All", query = "", page = 1, sort = "popularity" } = req.query

    let sortOption
    if (sort === "dateAdded") {
      sortOption = { createdAt: -1 }
    } else if (sort === "popularity") {
      sortOption = { likesCount: -1 }
    } else {
      sortOption = {}
    }

    const queryObject = {}
    if (category !== "All") {
      queryObject.category = category
    }
    if (query) {
      queryObject.$or = [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { code: { $regex: query, $options: "i" } },
      ]
    }

    const totalMaps = await Map.countDocuments(queryObject)

    const maps = await Map.find(queryObject)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "creator",
        select: "nickname _id",
        model: "User",
      })

    let likedMapIds
    if (req.user) {
      const mapsIds = maps.map((map) => map._id)
      // Find all likes by the current user for these posts
      const likes = await MapLike.find({
        user: req.user._id,
        map: { $in: mapsIds },
      })
      // Convert likes to a set of post IDs for easier checking
      likedMapIds = new Set(likes.map((like) => like.map.toString()))
    }

    const responseMaps = [...maps].map((map) => {
      const mapJson = map.toObject()
      mapJson.images = mapJson.images.map((imageName) => process.env.CLOUDFRONT_DOMAIN + imageName)
      if (likedMapIds) {
        mapJson.isLikedByCurrentUser = likedMapIds.has(map._id.toString())
      } else {
        mapJson.isLikedByCurrentUser = false
      }
      return mapJson
    })

    const totalPages = Math.ceil(totalMaps / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1
    res.json({
      currentPage: page,
      totalPages,
      totalMaps,
      itemsPerPage: limit,
      hasNextPage,
      hasPreviousPage,
      maps: responseMaps, // return the likesCount, and the rest of the properties without 'likes'
    })
  } catch (error) {
    console.error("Error fetching maps:", error)
    res.status(500).json({ error: "An error occurred while fetching the maps" })
  }
}
