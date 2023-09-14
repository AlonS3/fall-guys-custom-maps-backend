const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userModel");
const jwt = require('jsonwebtoken');
require("dotenv/config");
const { INTERNAL_ERROR, INVALID_STATE, UNAUTHORIZED_UPDATE } = require('../utils/utils');
const { generateRandomNickname } = require("../utils/randomNickname")


const passportConfig = {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `http://localhost:${process.env.PORT}/api/public/auth/google/callback`,
    passReqToCallback: true,
  };

  passport.use(new GoogleStrategy(passportConfig, function (request, accessToken, refreshToken, profile, done) {
    User.findOrCreate(
      { googleId: profile.id }, 
      {
        nickname: generateRandomNickname(),
        provider: profile.provider, 
        displayName: profile.displayName,
        email: profile._json.email,
        photo: profile._json.picture
      }, 
      function (err, user) {
        if (err) return done(err);
        return done(null, user);
      }
    );
  }));

  // New passport strategy for Google Update
passportConfig.callbackURL = `http://localhost:${process.env.PORT}/api/public/auth/google/update/callback`;
passport.use('google-update', new GoogleStrategy(passportConfig, async function (request, accessToken, refreshToken, profile, done) {
  // Extract and verify the JWT from the state parameter
  let decodedJwt;
  try {
    decodedJwt = jwt.verify(request.query.state, process.env.jwt_secret_key);
  } catch (err) {
    return done(INVALID_STATE);
  }
  try {
    const user  = await User.findOne({ googleId: profile.id });
    if (!user) return done(INTERNAL_ERROR);

    // Check if the user id from the JWT matches the authenticated user's id
    if (decodedJwt.userId !== user._id.toString()) {
      return done(UNAUTHORIZED_UPDATE);
    }
    const userUpdated = await User.findOneAndUpdate(
      { googleId: profile.id },
      {
        provider: profile.provider, 
        displayName: profile.displayName,
        email: profile._json.email,
        photo: profile._json.picture
      },
      {new: true}
    );
    if (!userUpdated) return done(INTERNAL_ERROR);

    return done(null, userUpdated);
  } catch (err) {
    return done(INTERNAL_ERROR);
  }
}));


module.exports = passport;