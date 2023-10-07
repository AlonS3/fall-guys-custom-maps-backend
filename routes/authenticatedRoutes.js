const express = require("express")
const router = express.Router()
const upload = require("../utils/upload")

const { authenticateJWT } = require("../middlewares/jwtAuth")
const { googleUpdateAuth, logout, authenticateSession } = require("../controllers/authController")
const { deleteUser, updateUserInformation, getUserProfile } = require("../controllers/userController")
const { createMap, updateMap, likeMap, unlikeMap, deleteMap } = require("../controllers/mapController")

router.get("/profile", authenticateSession, getUserProfile)

//update profile from google account
router.get("/user/auth/google/update", authenticateSession, googleUpdateAuth)

// delete user
router.delete("/user", authenticateSession, deleteUser)

// update user information
router.patch("/user", authenticateSession, updateUserInformation)

// log user out
router.get("/logout", authenticateSession, logout)

// add new map
router.post("/map", authenticateSession, upload, createMap)

// edit map
router.patch("/map/:mapId", authenticateSession, updateMap)

// delete map
router.delete("/map/:mapId", authenticateSession, deleteMap)

// like a map
router.patch("/map/like/:mapId", authenticateSession, likeMap)

// unlike a map
router.patch("/map/unlike/:mapId", authenticateSession, unlikeMap)

module.exports = router
