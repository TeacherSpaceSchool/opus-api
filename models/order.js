const mongoose = require('mongoose');

const OrderSchema = mongoose.Schema({
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CategoryOpus'
    },
    subcategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SubcategoryOpus'
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    },
    executor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    },
    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatOpus'
    },
    name: String,
    address: String,
    info: String,
    geo: [Number],
    dateStart: Date,
    dateEnd: Date,
    price: String,
    urgency: Boolean,
    images: [String],
    apartment: String,
    del: Boolean,
    status: String,
    review: Boolean,
    city: String,
    cancelExecutor: String,
    cancelCustomer: String,
    confirm: Boolean,
    views: [String],
    responsedUsers: [String]
}, {
    timestamps: true
});

OrderSchema.index({category: 1})
OrderSchema.index({subcategory: 1})
OrderSchema.index({customer: 1})
OrderSchema.index({executor: 1})
OrderSchema.index({createdAt: 1})
OrderSchema.index({del: 1})

const Specialization = mongoose.model('OrderOpus', OrderSchema);

module.exports = Specialization;