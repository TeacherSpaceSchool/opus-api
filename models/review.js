const mongoose = require('mongoose');

const ReviewSchema = mongoose.Schema({
    reiting: Number,
    images: [String],
    info: String,
    who: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    },
    whom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    }
}, {
    timestamps: true
});

ReviewSchema.index({whom: 1})
ReviewSchema.index({who: 1})

const Review = mongoose.model('ReviewOpus', ReviewSchema);

module.exports = Review;