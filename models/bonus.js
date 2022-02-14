const mongoose = require('mongoose');

const BonusSchema = mongoose.Schema({
    code: {
        type: String,
        unique: true
    },
    count: Number,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    }
}, {
    timestamps: true
});

BonusSchema.index({user: 1})
BonusSchema.index({code: 1})
BonusSchema.index({count: 1})

const Specialization = mongoose.model('BonusOpus', BonusSchema);

module.exports = Specialization;