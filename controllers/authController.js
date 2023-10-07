const passport = require("../config/passport-google-strategies")
const authService = require("../services/authService")
const jwt = require("jsonwebtoken")
require("dotenv/config")
const { INTERNAL_ERROR } = require("../utils/utils")

exports.googleAuth = passport.authenticate("google", { scope: ["profile", "email"] })

exports.authenticateGoogle = (req, res, next) => {
  passport.authenticate("google", { session: true }, (err, user) => {
    if (err || !user) {
      return res.redirect(process.env.FRONTEND_URL + "/login")
      // return res.status(500).json({ error: INTERNAL_ERROR });
    }
    //req.user = user // attach the user to the request
    req.login(user, function (err) {
      if (err) {
        return next(err)
      }
      next()
    })
    // next() // proceed to the next middleware
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
  passport.authenticate("google-update", { session: true }, (err, user) => {
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
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send("Failed to destroy session")
      }

      // Send the response immediately after destroying the session
      res.clearCookie("connect.sid")
      res.status(200).send("Logged out successfully")
      // Continue with the logout process in the background
      req.logout((err) => {
        if (err) {
          // console.error("Error during req.logout():", err)
        }
      })
    })
  } else {
    res.status(200).send("No session to destroy")
  }
}

exports.authenticateSession = (req, res, next) => {
  // First, use passport.session() to attempt session-based authentication
  passport.session()(req, res, () => {
    // After passport.session() middleware, check if user is authenticated
    if (req.isAuthenticated()) {
      return next() // User is authenticated, proceed to the next middleware
    }
    res.clearCookie("connect.sid")
    // Check if there's a session cookie but user is not authenticated (session expired)
    if (req.cookies["connect.sid"] && !req.isAuthenticated()) {
      return res.status(401).json({ message: "Session expired", redirect: "/login" })
    }

    // General unauthorized response
    res.status(401).json({ message: "Unauthorized", redirect: "/login" })
  })
}

exports.verifySession = (req, res, next) => {
  // First, use passport.session() to attempt session-based authentication
  passport.session()(req, res, next)
}

exports.sessionAuthenticationStatus = (req, res, next) => {
  // First, use passport.session() to attempt session-based authentication
  passport.session()(req, res, () => {
    // After passport.session() middleware, check if user is authenticated
    if (req.isAuthenticated()) {
      const responseObject = { loggedIn: true, user: req.user }
      return res.status(201).json(responseObject)
    }
    // If not authenticated, send an appropriate response
    return res.clearCookie("connect.sid").status(201).json({ loggedIn: false })
  })
}
