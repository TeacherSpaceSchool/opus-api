const PushNotification = require('../models/pushNotification');
const {sendWebPush} = require('../module/webPush');
const { saveImage, urlMain } = require('../module/const');

const type = `
  type PushNotification {
    _id: ID
    createdAt: Date
    title: String
    text: String
    tag: String
    url: String
    icon: String
    delivered: Int
    failed: Int
    click: Int
  }
`;

const query = `
    pushNotifications(search: String!, skip: Int!): [PushNotification]
    pushNotificationsCount(search: String!): Int
`;

const mutation = `
    addPushNotification(icon: Upload, text: String!, title: String!, tag: String, url: String): PushNotification
`;

const resolvers = {
    pushNotificationsCount: async(parent, {search}, {user}) => {
        if('admin'===user.role) {
            return await PushNotification.countDocuments({
                $or: [
                    {title: {'$regex': search, '$options': 'i'}},
                    {text: {'$regex': search, '$options': 'i'}},
                    {tag: {'$regex': search, '$options': 'i'}},
                    {url: {'$regex': search, '$options': 'i'}}
                ]
            })
                .lean()
        }
    },
    pushNotifications: async(parent, {search, skip}, {user}) => {
        if('admin'===user.role) {
            return await PushNotification.find({
                $or: [
                    {title: {'$regex': search, '$options': 'i'}},
                    {text: {'$regex': search, '$options': 'i'}},
                    {tag: {'$regex': search, '$options': 'i'}},
                    {url: {'$regex': search, '$options': 'i'}}
                ]
            })
                .sort('-createdAt')
                .skip(skip)
                .limit(15)
                .lean()
        }
    }
};

const resolversMutation = {
    addPushNotification: async(parent, {text, title, tag , url, icon}, {user}) => {
        if('admin'===user.role) {
            let payload = {title: title, message: text, user: 'all', tag: tag, url: url}
            if(icon){
                let { stream, filename } = await icon;
                filename = await saveImage(stream, filename)
                payload.icon = urlMain+filename
            }
            await sendWebPush(payload)
            return await PushNotification.findOne().sort('-createdAt').lean()
        }
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;