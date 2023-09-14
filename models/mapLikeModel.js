const mongoose = require('mongoose');

const MapLikeSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    map: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Map',
        required: true,
    },
}, { timestamps: true });

// Unique compound index to ensure a user can only like a post once
MapLikeSchema.index({ user: 1, map: 1 }, { unique: true });
MapLikeSchema.index({ user: 1 });

const MapLike = mongoose.model('Map-Like', MapLikeSchema);

module.exports = MapLike;
