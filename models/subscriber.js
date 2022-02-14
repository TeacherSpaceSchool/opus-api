const mongoose = require('mongoose');

const SubscriberSchema = mongoose.Schema({
    endpoint: String,
    keys: mongoose.Schema.Types.Mixed,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    },
    number: String,
    status: String,
}, {
    timestamps: true
});

SubscriberSchema.index({user: 1})
SubscriberSchema.index({number: 1})

const Subscriber = mongoose.model('SubscriberOpus', SubscriberSchema);

module.exports = Subscriber;