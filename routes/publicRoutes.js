const express = require("express")
const router = express.Router()
const {
  googleAuth,
  authenticateGoogle,
  createTokenAndRespond,
  authenticateAndUpdateGoogle,
  verifySession,
  sessionAuthenticationStatus,
} = require("../controllers/authController")
const { getMap, getMaps } = require("../controllers/mapController")
const { getUser } = require("../controllers/userController")
const { checkJWTStatus, verifyJWT } = require("../middlewares/jwtAuth")

router.get("/auth/status", sessionAuthenticationStatus)

router.get("/auth/google", googleAuth)
router.get("/auth/google/callback", authenticateGoogle, (req, res) => {
  res.redirect(process.env.FRONTEND_URL)
})

//update profile from google account
router.get("/auth/google/update/callback", authenticateAndUpdateGoogle, (req, res) => {
  res.redirect(process.env.FRONTEND_URL + "/profile")
  // res.json({ message: "Updated user information successfully", user: req.user })
})

// get map
router.get("/map/:mapId", verifySession, getMap)

//get user
router.get("/user/:userId", verifySession, getUser)

router.get("/maps", verifySession, getMaps)

router.get("/login/failed", (req, res) => {
  res.status(401).json({
    success: false,
    message: "failure",
  })
})

module.exports = router
