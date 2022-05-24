const mongoose = require('mongoose');

const CategorySchema = mongoose.Schema({
    name: String,
    image: String,
    priority: Number,
    del: Boolean,
    status: String,
    searchWords: String
}, {
    timestamps: true
});

CategorySchema.index({del: 1})
CategorySchema.index({searchWords: 1})
CategorySchema.index({status: 1})
CategorySchema.index({name: 1})

const Category = mongoose.model('CategoryOpus', CategorySchema);

module.exports = Category;