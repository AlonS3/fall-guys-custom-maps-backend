const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/userModel');
require("dotenv/config");

const cookieExtractor = function(req) {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies['jwt'];
  }
  return token;
};

passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
  secretOrKey: process.env.jwt_secret_key,
}, async (jwt_payload, done) => {
  try {
    const user = await User.findById(jwt_payload.user._id).exec();
    if (!user) return done(null, false);
    return done(null, user);
  } catch(err) {
    return done(err, false);
  }
}));

passport.use("jwt-status", new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
  secretOrKey: process.env.jwt_secret_key,
}, async (jwt_payload, done) => {
  try {
    // Use 'select' to only return 'nickname' and 'photo' fields
    const user = await User.findById(jwt_payload.user._id).select('nickname photo').exec();
    if (!user) return done(null, false);
    return done(null, user);
  } catch(err) {
    return done(err, false);
  }
}));

passport.use("jwt-verify", new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),
  secretOrKey: process.env.jwt_secret_key,
}, async (jwt_payload, done) => {
  done(null, jwt_payload.user);
}));

module.exports = passport;
