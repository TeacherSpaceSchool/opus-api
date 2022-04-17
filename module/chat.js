const Chat = require('../models/chat');
const Message = require('../models/message');
const User = require('../models/user');
const { sendWebPush } = require('./webPush');
const adminLogin = require('./const').adminLogin

const sendMessageByAdmin = async({user, text, type, push}) => {

   let admin = (await User.findOne({login: adminLogin}).lean())._id
    let chat = await Chat.findOne({part1: admin, part2: user})
    if(!chat) {
        chat = new Chat({
            part1: admin,
            part2: user,
            part1Unread: false,
            part2Unread: true
        });
        chat = await Chat.create(chat);
    }
    let object = new Message({
        who: admin,
        whom: user,
        type,
        text,
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
    chat.part2Unread = true

    let _user = await User.findById(user).select('unreadBN')
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

    const { pubsub } = require('../graphql/index');
    const RELOAD_DATA = 'RELOAD_DATA';
    pubsub.publish(RELOAD_DATA, {
        reloadData: {
            users: [object.whom._id],
            message: object
        }
    });

    if(push) {
        setTimeout(async () => {
            await sendWebPush({
                tag: chat._id,
                icon: object.who.avatar,
                title: object.who.name,
                message: object.text,
                url: `${process.env.URL.trim()}/chat/${chat._id}`,
                user: object.whom._id
            })
        }, 10000)
    }

}

module.exports.sendMessageByAdmin = sendMessageByAdmin