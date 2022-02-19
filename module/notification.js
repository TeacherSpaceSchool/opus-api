const Order = require('../models/order');
const Application = require('../models/application');
const Notification = require('../models/notification');
const User = require('../models/user');
const { pubsub } = require('../graphql/index');
const RELOAD_DATA = 'RELOAD_DATA';
const { sendWebPush, sendWebPushBySubcategory } = require('../module/webPush');

module.exports.sendNotification = async({type, who, whom, message, order, application, chat, url, title}) => {
    let notification = new Notification({
        type,
        who,
        whom,
        message,
        order,
        application,
        url,
        title,
        chat
    });
    notification = await Notification.create(notification)

    whom = await User.findOne({_id: whom}).select('unreadBN')
    if(!whom.unreadBN){
        whom.unreadBN = {notifications1: true}
        await whom.save()
    }
    else if(!whom.unreadBN.notifications1) {
        whom.unreadBN = {...whom.unreadBN, notifications1: true}
        await whom.save()
    }

    notification = await Notification.findOne({_id: notification._id})
        .populate({
            path: 'order',
            select: '_id name status'
        })
        .populate({
            path: 'order',
            select: '_id name status'
        })
        .populate({
            path: 'who',
            select: '_id name avatar reiting completedWorks login'
        })
        .populate({
            path: 'application',
            select: '_id'
        })
        .populate({
            path: 'chat',
            select: '_id'
        })
        .lean()
    pubsub.publish(RELOAD_DATA, {
        reloadData: {
            users: [notification.whom._id],
            notification
        }
    });
    await sendWebPush({
        tag: type,
        title: notification.title,
        message: notification.message,
        url,
        user: notification.whom._id
    })
}

module.exports.sendNotificationBySubcategory = async({message, order, subcategory, url, title}) => {
    let notification = {
        type: 99,
        title,
        message,
        order: {_id: order}
    }
    pubsub.publish(RELOAD_DATA, {
        reloadData: {
            subcategory,
            notification
        }
    });
    sendWebPushBySubcategory({
        title,
        message,
        url,
        tag: `${title}${message}`,
        subcategory
    })
}

module.exports.reductionToNotification = async() => {
    let notifications = await Notification.find()
    let length = 0
    for(let i = 0; i<notifications.length;i++){
        let del = !(await Order.findOne({_id: notifications[i].order}).select('_id').lean())&&!(await Application.findOne({_id: notifications[i].application}).select('_id').lean())
        if(del){
            length+=1
            await Notification.findByIdAndDelete(notifications[i]._id)
        }
    }
    console.log(`reductionToNotification: ${length}`)
}