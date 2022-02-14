const Notification = require('../models/notification');

const type = `
  type Notification {
    _id: ID
    createdAt: Date
    type: Int
    who: User
    whom: User
    message: String
    url: String
    chat: Chat
    order: Order
    application: Application
    title: String
  }
`;

const query = `
    notifications(user: ID, skip: Int!, limit: Int, order: ID, application: ID): [Notification]
`;

const resolvers = {
    notifications: async(parent, {user, skip, order, application, limit}, ctx) => {
        if(['admin', 'client'].includes(ctx.user.role)) {
            if('client'===ctx.user.role) user = ctx.user._id
            let res = await Notification.find({
                ...user||'client'===ctx.user.role?{
                    $or: [
                        {whom: user},
                        {who: user}
                    ]
                }:{},
                ...order?{order}:{},
                ...application?{application}:{},
            })
                .skip(skip)
                .limit(limit?limit:15)
                .sort('-createdAt')
                .populate({
                    path: 'order',
                    select: '_id name status review'
                })
                .populate({
                    path: 'who',
                    select: '_id name avatar login reiting completedWorks'
                })
                .populate({
                    path: 'whom',
                    select: '_id name login avatar'
                })
                .lean()
            return res
        }
    }
};

module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;