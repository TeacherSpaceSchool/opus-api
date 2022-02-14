const mongoose = require('mongoose');

const BonusHistorySchema = mongoose.Schema({
    count: Number,
    what: String,
    invited: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    }
}, {
    timestamps: true
});

BonusHistorySchema.index({user: 1})
BonusHistorySchema.index({createdAt: 1})

const Specialization = mongoose.model('BonusHistoryOpus', BonusHistorySchema);

module.exports = Specialization;