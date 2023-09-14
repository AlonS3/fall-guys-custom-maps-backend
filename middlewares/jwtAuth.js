
const passport = require('../config/passport');
require("dotenv/config");
const { INTERNAL_ERROR } = require('../utils/utils');

exports.authenticateJWT = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (err, user, info) => {
    if (err){
      return res.status(500).json({ error: INTERNAL_ERROR })
    }
    if (info && info.name === "TokenExpiredError"){
      res.clearCookie('jwt');
      return res.status(401).json({ message: 'Session expired. Please sign in to your account.', redirect: '/login' });
    }
    if (!user) {
      res.clearCookie('jwt');
      return res.status(401).json({ message: 'Unauthorized', redirect: '/login' });
    }
    req.user = user; // attach the user to the request
    next(); // proceed to the next middleware
  })(req, res, next);
}

exports.checkJWTStatus = (req, res) => {
    passport.authenticate('jwt-status', { session: false }, (err, user) => {
        if (err || !user) {
          res.clearCookie('jwt');
          return res.status(201).json({ loggedIn: false }); 
        }
        const responseObject = {loggedIn : true, user: user.toObject()}
        return res.status(201).json(responseObject);
      })(req, res);
}

exports.verifyJWT = (req, res, next) => {
  passport.authenticate('jwt-verify', { session: false }, (err, user) => {
    if (user){
      req.user = user; // attach the user to the request
    }
    next(); // proceed to the next middleware
    })(req, res, next);
}