const mongoose = require('mongoose');

const BlogSchema = mongoose.Schema({
    image: String,
    text: String,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    },
}, {
    timestamps: true
});

BlogSchema.index({createdAt: 1})
BlogSchema.index({user: 1})

const Blog = mongoose.model('BlogOpus', BlogSchema);

module.exports = Blog;