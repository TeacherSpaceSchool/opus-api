const mongoose = require('mongoose');

const MainSubcategorySchema = mongoose.Schema({
    sc1: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubcategoryOpus'
    },
    sc2: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubcategoryOpus'
    },
    sc3: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubcategoryOpus'
    },
    sc4: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubcategoryOpus'
    },
    sc5: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubcategoryOpus'
    },
    sc6: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubcategoryOpus'
    },
}, {
    timestamps: true
});

const MainSubcategory = mongoose.model('MainSubcategoryOpus', MainSubcategorySchema);

module.exports = MainSubcategory;