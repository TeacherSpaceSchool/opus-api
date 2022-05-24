const mongoose = require('mongoose');

const ApplicationSchema = mongoose.Schema({
    status: String,
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CategoryOpus'
    },
    subcategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubcategoryOpus'
    },
    verification: Boolean,
    documents: [String],
    comments: [String],
    info: String,
    unread: Boolean,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    },
    approvedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    }
}, {
    timestamps: true
});

ApplicationSchema.index({user: 1})
ApplicationSchema.index({status: 1})
ApplicationSchema.index({createdAt: 1})

const Application = mongoose.model('ApplicationOpus', ApplicationSchema);

module.exports = Application;