const mongoose = require('mongoose');

const NotificationSchema = mongoose.Schema({
    type: Number,
    who: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    },
    whom: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    },
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatOpus'
    },
    title: String,
    message: String,
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'OrderOpus'
    },
    application: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ApplicationOpus'
    },
    url: String
}, {
    timestamps: true
});

NotificationSchema.index({whom: 1})
NotificationSchema.index({order: 1})

const Notification = mongoose.model('NotificationOpus', NotificationSchema);

module.exports = Notification;