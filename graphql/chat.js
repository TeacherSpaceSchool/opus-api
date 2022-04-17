const Chat = require('../models/chat');
const Message = require('../models/message');
const User = require('../models/user');
const { saveImage, urlMain, saveFile } = require('../module/const');
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
  }
`;

const query = `
    chats(user: ID, skip: Int!): [Chat]
    chat(_id: ID!): Chat
    messages(chat: ID!, skip: Int!): [Message]
`;

const mutation = `
    sendMessage(type: String!, text: String, file: Upload, chat: ID!): Message
    readChat(chat: ID!): String
`;

const resolvers = {
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
    chats: async(parent, {user, skip}, ctx) => {
        if(['admin', 'client'].includes(ctx.user.role)) {
            if('client'===ctx.user.role) user = ctx.user._id
            return await Chat.find({
                $or: [
                    {part1: user},
                    {part2: user}
                ]
            })
                .sort('-updatedAt')
                .skip(skip)
                .limit(15)
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
                chat,
                ...'client'===user.role?{
                    $or: [
                        {who: user},
                        {whom: user}
                    ]
                }:{}
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
    sendMessage: async(parent, {type, text, file, chat}, {user}) => {
        if(user.role==='client'){
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
            sendWebPush({
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
        if(user.role==='client'){
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