const passport = require("../config/passport-google-strategies")
const authService = require("../services/authService")
const jwt = require("jsonwebtoken")
require("dotenv/config")
const { INTERNAL_ERROR } = require("../utils/utils")

exports.googleAuth = passport.authenticate("google", { scope: ["profile", "email"] })

exports.authenticateGoogle = (req, res, next) => {
  passport.authenticate("google", { session: false }, (err, user) => {
    if (err || !user) {
      return res.redirect(process.env.FRONTEND_URL + "/login")
      // return res.status(500).json({ error: INTERNAL_ERROR });
    }
    req.user = user // attach the user to the request
    next() // proceed to the next middleware
  })(req, res, next)
}

exports.googleUpdateAuth = (req, res, next) => {
  const state = jwt.sign(
    { userId: req.user._id.toString() },
    process.env.jwt_secret_key,
    { expiresIn: "1h" } // the state parameter is only valid for 1 hour
  )
  passport.authenticate("google-update", {
    scope: ["profile", "email"],
    state: state,
  })(req, res, next)
}

exports.authenticateAndUpdateGoogle = (req, res, next) => {
  passport.authenticate("google-update", { session: false }, (err, user) => {
    if (err || !user) {
      return res.redirect(process.env.FRONTEND_URL + "/login")
      return res.status(500).json({ error: err })
    }
    req.user = user // attach the user to the request
    next() // proceed to the next middleware
  })(req, res, next)
}

exports.createTokenAndRespond = (req, res) => {
  const token = authService.signToken(req.user)
  res.cookie("jwt", token, { httpOnly: true })
  // res.json({message: 'Authentication was successful'});
  res.redirect(process.env.FRONTEND_URL)
}

exports.logout = (req, res) => {
  res.clearCookie("jwt")
  res.json({ message: "You are successfully logged out" })
}
