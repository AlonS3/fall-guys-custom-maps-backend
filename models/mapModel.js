const mongoose = require('mongoose');


const Map = new mongoose.Schema({
    title: {type: String, required: true},
    description: { type: String, required: true},
    code: { 
        type: String, 
        required: true,
        unique: true,
        validate: {
          validator: function (value) {
            // Regular expression to match the desired format
            const codeRegex = /^[0-9]{4}-[0-9]{4}-[0-9]{4}$/;
            return codeRegex.test(value);
          },
          message: 'Invalid map code format. Please use the format: xxxx-xxxx-xxxx',
        }
       },
    category: { 
        type: String,
        enum: ['Casual', 'Art', 'Challenge'],
        required: true
    },
    images: { type: [{ type: String}], required: true},
    creator: { type: mongoose.Types.ObjectId, ref: 'User', required: true },
    likesCount : {type: Number, default: 0 }
}, { timestamps: true })

module.exports = mongoose.model('Map', Map);