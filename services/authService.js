const jwt = require('jsonwebtoken');
require('dotenv/config');

exports.signToken = (user) => {
  return jwt.sign(
    { user: { email: user.email, _id: user._id } }, 
    process.env.jwt_secret_key, 
    { expiresIn: '1h' }
  );
};
