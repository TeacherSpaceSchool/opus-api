const mongoose = require('mongoose');

const PaymentSchema = mongoose.Schema({
    number: String,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    },
    service: String,
    status: String,
    paymentSystem: String,
    amount: Number,
    refund: Boolean
}, {
    timestamps: true
});

PaymentSchema.index({user: 1})
PaymentSchema.index({status: 1})
PaymentSchema.index({service: 1})
PaymentSchema.index({paymentSystem: 1})

const Specialization = mongoose.model('PaymentOpus', PaymentSchema);

module.exports = Specialization;