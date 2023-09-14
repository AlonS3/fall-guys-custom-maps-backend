const mongoose = require('mongoose');
const User = require("../models/userModel");

exports.createMapDBTransaction = async (map, userId) => {
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      await map.save({ session: session });
      await User.findByIdAndUpdate(userId, { $addToSet: { maps: map._id } }, { session: session, new: true, useFindAndModify: false });
      await session.commitTransaction();
      return { success: true, map };
    } catch (err) {
      await session.abortTransaction();
      return { success: false, error: err };
    } finally {
      session.endSession();
    }
  };