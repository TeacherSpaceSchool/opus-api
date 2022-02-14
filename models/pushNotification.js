const mongoose = require('mongoose');

const PushNotificationSchema = mongoose.Schema({
    tag: String,
    url: String,
    icon: String,
    title: String,
    text: String,
    delivered: Number,
    failed: Number,
    click: {
        type: Number,
        default: 0
    },
    ips: {
        type: [String],
        default: []
    },
    who: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    },
}, {
    timestamps: true
});

PushNotificationSchema.index({createdAt: 1})
PushNotificationSchema.index({title: 1})
PushNotificationSchema.index({text: 1})
PushNotificationSchema.index({url: 1})
PushNotificationSchema.index({tag: 1})

const PushNotification = mongoose.model('PushNotificationOpus', PushNotificationSchema);

module.exports = PushNotification;