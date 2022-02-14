const Payment = require('../models/payment');
const { saveImage, deleteFile, urlMain } = require('../module/const');
const User = require('../models/user');

const type = `
  type Payment {
    _id: ID
    createdAt: Date
    number: String
    user: User
    service: String
    status: String
    paymentSystem: String
    amount: Float
    refund: Boolean
  }
`;

const query = `
    payments(search: String, skip: Int!, paymentSystem: String, date: String): [Payment]
`;

const mutation = `
    refundPayment(_id: ID!): String
`;

const resolvers = {
    payments: async(parent, {search, skip, paymentSystem, date}, {user}) => {
        if(['admin', 'client'].includes(user.role)) {
            let dateStart, dateEnd
            if (date&&date.length) {
                dateStart = new Date(date)
                dateStart.setHours(0, 0, 0, 0)
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
            let searchedUsers
            if(search)
                searchedUsers = await User.find({
                    name: {'$regex': search, '$options': 'i'},
                })
                    .distinct('_id')
                    .lean()
            return await Payment.find({
                ...dateStart ? {$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]} : {},
                ...paymentSystem ? {paymentSystem} : {},
                ...'client'===user.role?{user: user._id}:{},
                ...search?{$or: [
                    {user: {$in: searchedUsers}},
                    {number: {'$regex': search, '$options': 'i'}},
                ]}:{}
            })
                .sort('-createdAt')
                .skip(skip)
                .limit(15)
                .populate({
                    path: 'user',
                    select: '_id name'
                })
                .lean()
        }
    }
};

const resolversMutation = {
    refundPayment: async(parent, { _id }, {user}) => {
        if('admin'===user.role) {
            let object = await Payment.findOne({_id})
            if(object) {
                object.refund = true
                await object.save()
            }
        }
        return 'OK'
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;