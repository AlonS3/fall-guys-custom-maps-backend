const express = require("express");
const router = express.Router();
const upload = require('../utils/upload')

const {authenticateJWT} = require("../middlewares/jwtAuth");
const { googleUpdateAuth, logout } = require("../controllers/authController");
const { deleteUser, updateUserInformation, getUserProfile } = require('../controllers/userController');
const { createMap, updateMap, likeMap, unlikeMap, deleteMap } = require("../controllers/mapController")


router.get("/test", authenticateJWT, (req, res) => {
  res.json({ message: "Authenticated route working correctly"});
});

router.get("/profile", authenticateJWT, getUserProfile)

//update profile from google account
router.get("/user/auth/google/update", authenticateJWT, googleUpdateAuth);

// delete user
router.delete("/user", authenticateJWT, deleteUser);

// update user information
router.patch("/user", authenticateJWT, updateUserInformation);

// log user out
router.get('/logout', authenticateJWT, logout);

// add new map
router.post("/map", authenticateJWT , upload, createMap)

// edit map
router.patch("/map/:mapId", authenticateJWT, updateMap)

// delete map
router.delete("/map/:mapId", authenticateJWT, deleteMap)

// like a map
router.patch("/map/like/:mapId", authenticateJWT, likeMap)

// unlike a map
router.patch("/map/unlike/:mapId", authenticateJWT, unlikeMap)

module.exports = router;
