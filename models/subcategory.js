const mongoose = require('mongoose');

const SubcategorySchema = mongoose.Schema({
    name: String,
    del: Boolean,
    autoApplication: Boolean,
    image: String,
    priority: Number,
    status: String,
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CategoryOpus'
    },
    searchWords: String
}, {
    timestamps: true
});

SubcategorySchema.index({searchWords: 1})
SubcategorySchema.index({category: 1})
SubcategorySchema.index({del: 1})
SubcategorySchema.index({autoApplication: 1})
SubcategorySchema.index({name: 1})

const Specialization = mongoose.model('SubcategoryOpus', SubcategorySchema);

module.exports = Specialization;