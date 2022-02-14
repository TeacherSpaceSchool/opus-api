const Subscriber = require('../models/subscriber');
const User = require('../models/user');
const q = require('q');
const webPush = require('web-push');
const keys = require((process.env.URL).trim()==='https://opus.kg'?'./../config/keys_prod':'./../config/keys_dev');
const PushNotification = require('../models/pushNotification');

const sendWebPush = async({title, message, tag, url, icon, user}) => {
    const payload = {
        title: title?title:title,
        message: message?message:message,
        url: url?url:(process.env.URL).trim(),
        icon: icon?icon:`${(process.env.URL).trim()}/static/192x192.png`,
        tag: tag?tag:'OPUS'
    };
    if(user==='all'){
        let _object = new PushNotification({
            tag: payload.tag,
            url: payload.url,
            icon: payload.icon,
            title: payload.title,
            text: payload.message,
            delivered: 0,
            failed: 0,
            click: 0
        });
        _object = await PushNotification.create(_object)
        payload._id = _object._id
        Subscriber.find({}, (err, subscriptions) => {
            if (err) {
                console.error('Error occurred while getting subscriptions');
            } else {
                let parallelSubscriberCalls = subscriptions.map((subscription) => {
                    return new Promise((resolve, reject) => {
                        const pushSubscriber = {
                            endpoint: subscription.endpoint,
                            keys: {
                                p256dh: subscription.keys.p256dh,
                                auth: subscription.keys.auth
                            }
                        };
                        const pushPayload = JSON.stringify(payload);
                        const pushOptions = {
                            vapidDetails: {
                                subject: 'https://opus.kg',
                                privateKey: keys.privateKey,
                                publicKey: keys.publicKey
                            },
                            headers: {}
                        };
                        webPush.sendNotification(
                            pushSubscriber,
                            pushPayload,
                            pushOptions
                        ).then((value) => {
                            resolve({
                                status: true,
                                endpoint: subscription.endpoint,
                                data: value
                            });
                        }).catch((err) => {
                            reject({
                                status: false,
                                endpoint: subscription.endpoint,
                                data: err
                            });
                        });
                    });
                });
                q.allSettled(parallelSubscriberCalls).then(async(pushResults) => {
                    try{
                        let delivered = 0;
                        let failed = 0;
                        for(let i=0; i<pushResults.length; i++){
                            if(pushResults[i].state === 'rejected'||pushResults[i].reason)
                                failed+=1
                            else
                                delivered += 1
                        }
                        _object.delivered = delivered
                        _object.failed = failed
                        await _object.save()
                    } catch (err) {
                        console.error(err)
                    }
                });
            }
        }).lean();
    }
    else {
        Subscriber.find({user}, (err, subscriptions) => {
            if (err) {
                console.error('Error occurred while getting subscriptions');
            } else {
                let parallelSubscriberCalls = subscriptions.map((subscription) => {
                    return new Promise((resolve, reject) => {
                        const pushSubscriber = {
                            endpoint: subscription.endpoint,
                            keys: {
                                p256dh: subscription.keys.p256dh,
                                auth: subscription.keys.auth
                            }
                        };

                        const pushPayload = JSON.stringify(payload);
                        const pushOptions = {
                            vapidDetails: {
                                subject: 'https://opus.kg',
                                privateKey: keys.privateKey,
                                publicKey: keys.publicKey
                            },
                            headers: {}
                        };
                        webPush.sendNotification(
                            pushSubscriber,
                            pushPayload,
                            pushOptions
                        ).then((value) => {
                            resolve({
                                status: true,
                                endpoint: subscription.endpoint,
                                data: value
                            });
                        }).catch((err) => {
                            reject({
                                status: false,
                                endpoint: subscription.endpoint,
                                data: err
                            });
                        });
                    });
                });
                q.allSettled(parallelSubscriberCalls).then(async (pushResults) => {
                    //console.log(pushResults)
                });
            }
        }).lean();
    }

 }

let sendWebPushByRolesIds = async ({title, message, url, roles, _ids, tag})=>{
    for(let i = 0; i<roles.length; i++){
        let users
        users = await User.find({role: roles[i]}).distinct('_id').lean()
        for(let i1 = 0; i1<users.length; i1++) {
            await sendWebPush({title, message, url, user: users[i1], tag})
        }
    }
    for(let i = 0; i<_ids.length; i++) {
        await sendWebPush({title, message, url, user: _ids[i], tag})
    }

}

let sendWebPushBySubcategory = async ({title, message, url, tag,  subcategory})=>{
    let users = await User.find({specializations: {$elemMatch: {subcategory}}}).distinct('_id').lean()
    for(let i1 = 0; i1<users.length; i1++) {
        await sendWebPush({title, message, url, user: users[i1], tag})
    }
}

module.exports.sendWebPushBySubcategory = sendWebPushBySubcategory
module.exports.sendWebPushByRolesIds = sendWebPushByRolesIds
module.exports.sendWebPush = sendWebPush