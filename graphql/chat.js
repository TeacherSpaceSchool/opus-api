const Chat = require('../models/chat');
const Message = require('../models/message');
const User = require('../models/user');
const { saveImage, urlMain, saveFile } = require('../module/const');
const { sendSmsMailing } = require('../module/sms');
const { pubsub } = require('./index');
const RELOAD_DATA = 'RELOAD_DATA';
const { sendWebPush } = require('../module/webPush');

const type = `
  type Chat {
    _id: ID
    createdAt: Date
    updatedAt: Date
    part1: User
    part2: User
    part1Unread: Boolean
    part2Unread: Boolean
    lastMessage: Message
  }
  type Message {
    _id: ID
    createdAt: Date
    who: User
    whom: User
    type: String
    text: String
    file: String
    chat: ID
    mailing: [ID]
  }
`;

const query = `
    chats(user: ID, skip: Int!, limit: Int, search: String): [Chat]
    mailingMessageCount(id: ID, typeMailing: String!): [Int]
    chat(_id: ID!): Chat
    messages(chat: ID!, skip: Int!): [Message]
`;

const mutation = `
    sendMessage(type: String!, text: String, file: Upload, chat: ID!): Message
    mailingMessage(type: String!, text: String, file: Upload, id: ID, typeMailing: String!): String
    readChat(chat: ID!): String
`;

const resolvers = {
    mailingMessageCount: async(parent, {id, typeMailing}, {user, req}) => {
        if('admin'===user.role) {
            let city = req.cookies['city']?req.cookies['city']:'Бишкек'
            let countChat, countSms
            if(typeMailing==='Все') {
                countSms = await User.find({
                    role: {$in: 'client'},
                    status: 'active',
                    city,
                }).distinct('_id').lean()
                countChat = await Chat.countDocuments({part1: user._id, part2: {$in: countSms}}).lean()
            }
            else if(typeMailing==='Заказчики') {
                countSms = await User.find({
                    role: {$in: 'client'},
                    city,
                    status: 'active',
                    specializations: {$size: 0}
                }).distinct('_id').lean()
                countChat = await Chat.countDocuments({part1: user._id, part2: {$in: countSms}}).lean()
            }
            else if(typeMailing==='Исполнители') {
                countSms = await User.find({
                    role: {$in: 'client'},
                    city,
                    status: 'active',
                    specializations: {$not: {$size: 0}}
                }).distinct('_id').lean()
                countChat = await Chat.countDocuments({part1: user._id, part2: {$in: countSms}}).lean()
            }
            else if(typeMailing==='Категории') {
                countSms = await User.find({
                    role: {$in: 'client'},
                    city,
                    status: 'active',
                    specializations: {$elemMatch: {category: id}}
                }).distinct('_id').lean()
                countChat = await Chat.countDocuments({part1: user._id, part2: {$in: countSms}}).lean()
            }
            else if(typeMailing==='Подкатегории') {
                countSms = await User.find({
                    role: {$in: 'client'},
                    city,
                    status: 'active',
                    specializations: {$elemMatch: {subcategory: id}}
                }).distinct('_id').lean()
                countChat = await Chat.countDocuments({part1: user._id, part2: {$in: countSms}}).lean()
            }
            return [countChat, countSms.length]
        }
    },
    chat: async(parent, {_id}, {user}) => {
        if(['admin', 'client'].includes(user.role)) {
            let chat = await Chat.findOne({
                ...'client'===user.role?{
                    $or: [
                        {part1: user._id},
                        {part2: user._id}
                    ]
                }:{},
                _id
            })
                .populate({
                    path: 'part1',
                    select: '_id name avatar login'
                })
                .populate({
                    path: 'part2',
                    select: '_id name avatar login'
                })
                .lean()
            if(chat.part1._id.toString()===user._id.toString()&&chat.part1Unread) {
                await Chat.updateOne({_id}, {part1Unread: false})
            }
            else if(chat.part2._id.toString()===user._id.toString()&&chat.part2Unread) {
                await Chat.updateOne({_id}, {part2Unread: false})
            }
            return chat
        }
    },
    chats: async(parent, {user, skip, limit, search}, ctx) => {
        if(['admin', 'client'].includes(ctx.user.role)) {
            if('client'===ctx.user.role||'admin'===ctx.user.role&&!user) user = ctx.user._id
            let searchedUsers;
            if(search)
                searchedUsers = await User.find({
                    name: {'$regex': search, '$options': 'i'},
                })
                    .distinct('_id')
                    .lean()
            return await Chat.find(
                {
                    $and: [
                        {
                            $or: [
                                {part1: user},
                                {part2: user}
                            ]
                        },
                        ...search?[{
                            $or: [
                                {part1: {$in: searchedUsers}},
                                {part2: {$in: searchedUsers}},
                            ]
                        }]:[]
                    ]
                })
                .sort('-updatedAt')
                .skip(skip)
                .limit(limit?limit:15)
                .populate({
                    path: 'part1',
                    select: '_id name avatar'
                })
                .populate({
                    path: 'part2',
                    select: '_id name avatar'
                })
                .populate({
                    path: 'lastMessage',
                    select: 'type text'
                })
                .lean()
        }
    },
    messages: async(parent, {chat, skip}, {user}) => {
        if(['admin', 'client'].includes(user.role)) {
            return await Message.find({
                $or: [
                    {
                        chat,
                        ...'client'===user.role?{
                            $or: [
                                {who: user},
                                {whom: user}
                            ]
                        }:{}
                    },
                    {
                        mailing: chat
                    }
                ]
            })
                .sort('-createdAt')
                .skip(skip)
                .limit(15)
                .populate({
                    path: 'who',
                    select: '_id name'
                })
                .populate({
                    path: 'whom',
                    select: '_id name'
                })
                .lean()
        }
    }
};

const resolversMutation = {
    mailingMessage: async(parent, {type, text, file, id, typeMailing}, {req, user}) => {
        if('admin'===user.role) {
            let city = req.cookies['city']?req.cookies['city']:'Бишкек'
            let chats, users
            if(typeMailing==='Все') {
                users = await User.find({
                    role: {$in: 'client'},
                    status: 'active',
                    city,
                }).distinct('_id').lean()
                chats = await Chat.find({part1: user._id, part2: {$in: users}}).distinct('_id').lean()
                users = await Chat.find({part1: user._id, part2: {$in: users}}).distinct('part2').lean()
            }
            else if(typeMailing==='Заказчики') {
                users = await User.find({
                    role: {$in: 'client'},
                    city,
                    status: 'active',
                    specializations: {$size: 0}
                }).distinct('_id').lean()
                chats = await Chat.find({part1: user._id, part2: {$in: users}}).distinct('_id').lean()
            }
            else if(typeMailing==='Исполнители') {
                users = await User.find({
                    role: {$in: 'client'},
                    city,
                    status: 'active',
                    specializations: {$not: {$size: 0}}
                }).distinct('_id').lean()
                chats = await Chat.find({part1: user._id, part2: {$in: users}}).distinct('_id').lean()
            }
            else if(typeMailing==='Категории') {
                users = await User.find({
                    role: {$in: 'client'},
                    city,
                    status: 'active',
                    specializations: {$elemMatch: {category: id}}
                }).distinct('_id').lean()
                chats = await Chat.find({part1: user._id, part2: {$in: users}}).distinct('_id').lean()
            }
            else if(typeMailing==='Подкатегории') {
                users = await User.find({
                    role: {$in: 'client'},
                    city,
                    status: 'active',
                    specializations: {$elemMatch: {subcategory: id}}
                }).distinct('_id').lean()
                chats = await Chat.find({part1: user._id, part2: {$in: users}}).distinct('_id').lean()
            }

            if(type==='sms') {
                let phones = await User.find({_id: {$in: users}}).distinct('login').lean()
                await sendSmsMailing(phones, text)
            }
            else {
                if (file) {
                    let {stream, filename} = await file;
                    filename = type === 'image' ? await saveImage(stream, filename) : await saveFile(stream, filename)
                    file = urlMain + filename
                }
                let object = new Message({
                    who: user._id,
                    type,
                    text,
                    file,
                    mailing: chats
                });
                object = await Message.create(object)
                object = await Message.findOne({
                    _id: object._id
                })
                    .populate({
                        path: 'who',
                        select: '_id name avatar'
                    })
                    .lean()

                await Chat.updateMany({_id: {$in: chats}}, {lastMessage: object._id, part2Unread: true})
                await User.updateMany({_id: {$in: users}}, {unreadBN: {notifications0: true}})

                pubsub.publish(RELOAD_DATA, {
                    reloadData: {
                        users,
                        message: object,
                        mailing: true
                    }
                });
                await sendWebPush({
                    tag: 'mailing',
                    icon: object.who.avatar,
                    title: object.who.name,
                    message: object.text,
                    url: `${process.env.URL.trim()}/notifications?page=0`,
                    users
                })
            }
            return 'OK'
        }
        return 'ERROR'
    },
    sendMessage: async(parent, {type, text, file, chat}, {user}) => {
        if(['admin', 'client'].includes(user.role)) {
            chat = await Chat.findOne({
                $or: [
                    {part1: user._id},
                    {part2: user._id}
                ],
                _id: chat
            })
            if (file) {
                let {stream, filename} = await file;
                filename = type==='image'?await saveImage(stream, filename):await saveFile(stream, filename)
                file = urlMain + filename
            }
            let object = new Message({
                who: user._id,
                whom: chat.part1.toString()===user._id.toString()?chat.part2:chat.part1,
                type,
                text,
                file,
                chat: chat._id
            });
            object = await Message.create(object)
            object = await Message.findOne({
                _id: object._id
            })
                .populate({
                    path: 'who',
                    select: '_id name avatar'
                })
                .populate({
                    path: 'whom',
                    select: '_id name'
                })
                .lean()
            if(chat.part1.toString()===user._id.toString())
                chat.part2Unread = true
            else
                chat.part1Unread = true

            let _user = await User.findById(chat.part1.toString()===user._id.toString()?chat.part2:chat.part1).select('unreadBN')
            if(!_user.unreadBN){
                _user.unreadBN = {notifications0: true}
                await _user.save()
            }
            else if(!_user.unreadBN.notifications0) {
                _user.unreadBN = {..._user.unreadBN, notifications0: true}
                await _user.save()
            }

            chat.lastMessage = object._id
            await chat.save()

            pubsub.publish(RELOAD_DATA, {
                reloadData: {
                    users: [object.whom._id],
                    message: object
                }
            });
            await sendWebPush({
                tag: chat._id,
                icon: object.who.avatar,
                title: object.who.name,
                message: file?'Изображение':object.text,
                url: `${process.env.URL.trim()}/chat/${chat._id}`,
                user: object.whom._id
            })
            return object
        }
        return null
    },
    readChat: async(parent, {chat}, {user}) => {
        if(['admin', 'client'].includes(user.role)) {
            chat = await Chat.findOne({
                $or: [
                    {part1: user._id},
                    {part2: user._id}
                ],
                _id: chat
            })
            if(chat.part1.toString()===user._id.toString())
                chat.part1Unread = false
            else
                chat.part2Unread = false
            await chat.save()
            return 'OK'
        }
        return 'ERROR'
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;