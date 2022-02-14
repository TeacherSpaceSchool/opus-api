const mongoose = require('mongoose');

const ComplaintSchema = mongoose.Schema({
    taken: Boolean,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    },
    who: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    },
    text: String
}, {
    timestamps: true
});

ComplaintSchema.index({taken: 1})

const Complaint = mongoose.model('ComplaintOpus', ComplaintSchema);

module.exports = Complaint;