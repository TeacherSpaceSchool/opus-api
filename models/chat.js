const mongoose = require('mongoose');

const ChatSchema = mongoose.Schema({
    part1: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    },
    part2: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    },
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MessageOpus'
    },
    part1Unread: Boolean,
    part2Unread: Boolean
}, {
    timestamps: true
});

ChatSchema.index({part1: 1})
ChatSchema.index({part2: 1})
ChatSchema.index({updatedAt: 1})

const Specialization = mongoose.model('ChatOpus', ChatSchema);

module.exports = Specialization;