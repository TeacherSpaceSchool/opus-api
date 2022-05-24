const mongoose = require('mongoose');

const MessageSchema = mongoose.Schema({
    who: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    },
    whom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    },
    type: String,
    text: String,
    file: String,
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatOpus'
    },
    mailing: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatOpus'
    }]
}, {
    timestamps: true
});

MessageSchema.index({chat: 1})
MessageSchema.index({createdAt: 1})

const Message = mongoose.model('MessageOpus', MessageSchema);

module.exports = Message;