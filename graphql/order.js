const Order = require('../models/order');
const Notification = require('../models/notification');
const Chat = require('../models/chat');
const User = require('../models/user');
const { saveImage, deleteFile, urlMain, getGeoDistance, checkDate } = require('../module/const');
const { sendNotification, sendNotificationBySubcategory } = require('../module/notification');

const type = `
  type Order {
    _id: ID
    createdAt: Date
    category: Category
    subcategory: Subcategory
    address: String
    apartment: String
    customer: User
    executor: User
    name: String
    info: String
    geo: [Float]
    dateStart: Date
    dateEnd: Date
    price: String
    urgency: Boolean
    images: [String]
    del: Boolean
    status: String
    views: [String]
    review: Boolean
    cancelExecutor: String
    cancelCustomer: String
    confirm: Boolean
    verificationExecutor: Boolean
    responsedUsers: [String]
    chat: Chat
  }
`;

const query = `
    nearOrders(geo: [Float]!): [Order]
    orders(dateStart: Date, dateEnd: Date, skip: Int!, my: Boolean, user: ID, limit: Int, status: String, subcategory: ID, category: ID): [Order]
    ordersCount(dateStart: Date, dateEnd: Date, user: ID, subcategory: ID, category: ID): [Int]
    order(_id: ID!): Order
`;

const mutation = `
    addOrder(category: ID, subcategory: ID, verificationExecutor: Boolean, executor: ID, name: String!, address: String, apartment: String, info: String!, geo: [Float]!, dateStart: Date, dateEnd: Date, price: String, urgency: Boolean, uploads: [Upload]): String
    responseOrder(_id: ID!, message: String): String
    approveExecutor(_id: ID!, executor: ID): String
    confirmOrder(_id: ID!): String
    cancelOrder(_id: ID!, message: String): String
    cloneOrder(_id: ID!): String
    setOrder(_id: ID!, name: String, address: String, apartment: String, info: String, geo: [Float], dateStart: Date, dateEnd: Date, price: String, images: [String], uploads: [Upload], verificationExecutor: Boolean, urgency: Boolean): String
    deleteOrder(_id: ID!): String
`;

const resolvers = {
    ordersCount: async(parent, {dateStart, dateEnd, user, subcategory, category}, ctx) => {
        if(['admin', 'client'].includes(ctx.user.role)) {
            let city = ctx.req.cookies['city']?ctx.req.cookies['city']:'Бишкек'
            if('client'===ctx.user.role) user = ctx.user._id
            if(dateStart&&'admin'===ctx.user.role){
                dateStart= checkDate(dateStart)
                dateStart.setHours(3, 0, 0, 0)
                if(dateEnd){
                    dateEnd = new Date(dateEnd)
                    dateEnd.setHours(3, 0, 0, 0)
                }
                else {
                    dateEnd = new Date(dateStart)
                    dateEnd.setDate(dateEnd.getDate() + 1)
                }
            }
            let orders = await Order.find({
                city,
                ...'admin'===ctx.user.role&&!user?
                    {
                        ...dateStart?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
                        ...subcategory?{subcategory}:{},
                        ...category?{category}:{},
                    }
                    :
                    {
                        $or: [{customer: user}, {executor: user}]
                    }
            }).select('status').lean()
            let res = {
                'все': 0,
                'активный': 0,
                'принят': 0,
                'выполнен': 0,
                'отмена': 0
            }
            for (let i = 0; i < orders.length; i++) {
                res['все'] += 1
                res[orders[i].status] += 1
            }
            return Object.values(res)
        }
    },
    nearOrders: async(parent, {geo}, ctx) => {
        if(ctx.user.role==='client'&&ctx.user.specializations.length) {
            let city = ctx.req.cookies['city']?ctx.req.cookies['city']:'Бишкек'
            let allowSubcategories = [], resOrders = []
            if(ctx.user.role==='client')
                for (let i = 0; i < ctx.user.specializations.length; i++) {
                    if(/*ctx.user.specializations[i].end>new Date()&&*/ctx.user.specializations[i].enable)
                        allowSubcategories.push(ctx.user.specializations[i].subcategory)
                }
            let orders = await Order.find({
                city,
                subcategory: {$in: allowSubcategories},
                executor: null,
                customer: {$ne: ctx.user._id},
                geo: {$ne: null}
            })
                .sort('-createdAt')
                .populate({
                    path: 'subcategory',
                    select: '_id name'
                })
                .lean()
            for(let i=0; i<orders.length; i++) {
                if(getGeoDistance(...geo, ...orders[i].geo)<1500)
                    resOrders.push(orders[i])
            }
            return resOrders
        }
    },
    orders: async(parent, {dateStart, dateEnd, skip, my, user, limit, status, subcategory, category}, ctx) => {
        let city = ctx.req.cookies['city']?ctx.req.cookies['city']:'Бишкек'
        let allowSubcategories = []
        if(ctx.user.role==='client')
            for (let i = 0; i < ctx.user.specializations.length; i++) {
                if (/*ctx.user.specializations[i].end>new Date()&&*/ctx.user.specializations[i].enable)
                    allowSubcategories.push(ctx.user.specializations[i].subcategory)
            }
        if(dateStart&&'admin'===ctx.user.role){
            dateStart= checkDate(dateStart)
            dateStart.setHours(3, 0, 0, 0)
            if(dateEnd){
                dateEnd = new Date(dateEnd)
                dateEnd.setHours(3, 0, 0, 0)
            }
            else {
                dateEnd = new Date(dateStart)
                dateEnd.setDate(dateEnd.getDate() + 1)
            }
        }
        return await Order.find({
            city,
            ...status?{status}:{},
            ...ctx.user.role==='admin'?
                user?
                    {
                        $or: [{customer: user}, {executor: user}]
                    }
                    :
                    {
                        ...dateStart?{$and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}]}:{},
                        ...category?{category}:{},
                        ...subcategory?{subcategory}:{}
                    }
                :
                {
                    $and: [
                        ...subcategory?[{subcategory}]:[],
                        my&&ctx.user.role==='client'?
                            {$or: [{customer: ctx.user._id}, {executor: ctx.user._id}]}
                            :
                            {
                                ...ctx.user.specializations&&ctx.user.specializations.length?{subcategory: {$in: allowSubcategories}}:{},
                                customer: {$ne: ctx.user._id},
                                executor: null
                            }
                    ]
                }
        })
            .sort(ctx.user.role==='client'&&my||ctx.user.role==='admin'&&user?'-updatedAt':'-createdAt')
            .skip(skip)
            .limit(limit?limit:15)
            .populate({
                path: 'subcategory',
                select: '_id name'
            })
            .lean()
    },
    order: async(parent, {_id}, {user}) => {
        let order = await Order.findOne({
            _id,
            ...user.role==='client'?{
                $or: [
                    {
                        executor: null
                    },
                    {
                        customer: user._id
                    },
                    {
                        executor: user._id
                    }
                ]
            }:{}
        })
            .populate({
                path: 'customer',
                select: '_id name login'
            })
            .populate({
                path: 'executor',
                select: '_id name login'
            })
            .populate({
                path: 'category',
                select: '_id name'
            })
            .populate({
                path: 'subcategory',
                select: '_id name'
            })
        if(user._id&&order&&!order.views.includes(user._id.toString())){
            order.views.push(user._id)
            await order.save()
        }
        return order
    },
};

const resolversMutation = {
    cloneOrder: async(parent, {_id}, {user}) => {
        if(user.role==='client'){
            let object = await Order.findOne({
                _id,
                customer: user._id
            }).lean()
            if(object) {
                object = new Order({
                    category: object.category,
                    subcategory: object.subcategory,
                    customer: user._id,
                    name: object.name,
                    info: object.info,
                    geo: object.geo,
                    dateStart: object.dateStart,
                    dateEnd: object.dateEnd,
                    price: object.price,
                    urgency: object.urgency,
                    address: object.address,
                    verificationExecutor: object.verificationExecutor,
                    apartment: object.apartment,
                    images: object.images,
                    status: 'активный',
                    views: [],
                    city: user.city
                });
                object = await Order.create(object)
                await sendNotificationBySubcategory(
                    {
                        message: object.name,
                        order: object._id,
                        subcategory: object.subcategory,
                        url: `${process.env.URL.trim()}/order/${object._id}`,
                        title: 'Добавлен новый заказ'
                    }
                )
                return 'OK'
            }
            return 'ERROR'
        }
    },
    addOrder: async(parent, {category, verificationExecutor, subcategory, name, info, geo, dateStart, dateEnd, price, urgency, uploads, address, apartment, executor}, {user}) => {
        if(user.role==='client'){
            let images = []
            for(let i = 0; i<uploads.length;i++) {
                let { stream, filename } = await uploads[i];
                filename = await saveImage(stream, filename)
                images.push(urlMain+filename)
            }
            if(category&&subcategory) {
                let object = new Order({
                    category,
                    subcategory,
                    customer: user._id,
                    name,
                    info,
                    geo,
                    dateStart,
                    city: user.city,
                    dateEnd,
                    price,
                    verificationExecutor,
                    urgency,
                    address,
                    apartment,
                    images,
                    executor,
                    status: 'активный',
                    views: []
                });
                object = await Order.create(object)
                if (executor) {
                    await sendNotification({
                        type: 3,
                        title: object.name,
                        whom: object.executor,
                        who: user._id,
                        message: 'Исполнителю предложен заказ',
                        url: `${process.env.URL.trim()}/order/${object._id}`,
                        order: object._id,
                    })
                }
                else {
                    await sendNotificationBySubcategory(
                        {
                            message: object.name,
                            order: object._id,
                            subcategory,
                            url: `${process.env.URL.trim()}/order/${object._id}`,
                            title: 'Добавлен новый заказ'
                        }
                    )
                }
                return 'OK'
            }
            return 'ERROR'
        }
    },
    setOrder: async(parent, {_id, name, info, geo, dateStart, dateEnd, price, uploads, images, address, apartment, urgency, verificationExecutor}, {user}) => {
        if(['admin', 'client'].includes(user.role)) {
            let object = await Order.findOne({
                _id,
                ...'client'===user.role?{customer: user._id}:{}
            })
            if(object.status==='активный'){
                if(name) object.name = name
                if(info) object.info = info
                if(geo) object.geo = geo
                if(dateStart) object.dateStart = dateStart
                if(dateEnd) object.dateEnd = dateEnd
                if(price) object.price = price
                if(address) object.address = address
                if(apartment) object.apartment = apartment
                if(urgency!=undefined) object.urgency = urgency
                if(verificationExecutor!=undefined) object.verificationExecutor = verificationExecutor
                if (images)
                    for (let i = 0; i < object.images.length; i++)
                        if (!images.includes(object.images[i])) {
                            await deleteFile(object.images[i])
                            object.images.splice(i, 1)
                            i -= 1
                        }
                if (uploads)
                    for (let i = 0; i < uploads.length; i++) {
                        let {stream, filename} = await uploads[i];
                        filename = await saveImage(stream, filename)
                        object.images = [urlMain + filename, ...object.images]
                    }
            }
            await object.save();
            return 'OK'
        }
    },
    deleteOrder: async(parent, { _id }, {user}) => {
        if(['admin', 'client'].includes(user.role)){
            let object = await Order.findOne({
                _id, ...'client'===user.role?{customer: user._id}:{},
                status: 'активный',
            }).select('images').lean()
            if(object) {
                if(object.executor)
                    await Chat.deleteMany({
                        $or: [
                            {part1: object.executor, part2: object.customer},
                            {part2: object.executor, part1: object.customer}
                        ]
                    })
                await Notification.deleteMany({
                   order: _id
                })
                for (let i = 0; i < object.images.length; i++) {
                    await deleteFile(object.images[i])
                }
                await Order.findByIdAndDelete(_id)
            }
        }
        return 'OK'
    },
    approveExecutor: async(parent, { _id, executor }, {user}) => {
        if('client'===user.role&&(!executor||executor.toString()!==user._id.toString())) {
            let object = await Order.findOne({
                _id,
                status: 'активный',
                ...executor?{customer: user._id}:{executor: user._id, customer: {$ne: user._id}}
            })
            if(object) {
                object.status = 'принят'
                if(executor)
                    object.executor = executor
                let chat = await Chat.findOne({
                    $or: [{part1: object.executor, part2: object.customer},  {part2: object.executor, part1: object.customer}]
                }).select('_id').lean()
                if(!chat) {
                    chat = new Chat({
                        part1: object.executor,
                        part2: object.customer,
                        part1Unread: true,
                        part2Unread: true
                    });
                    chat = await Chat.create(chat);
                }

                object.chat = chat._id
                await object.save()

                let canceledSpecialists = await Notification.find({
                    order: object._id,
                    type: 1,
                    who: {$ne: object.executor}
                })
                    .distinct('who')
                    .lean()
                for(let i=0; i<canceledSpecialists.length; i++){
                    await sendNotification({
                        type: 6,
                        title: object.name,
                        whom: canceledSpecialists[i],
                        who: object.customer,
                        message: 'Исполнитель отклонен',
                        url: `${process.env.URL.trim()}/order/${object._id}`,
                        order: object._id,
                    })
                }


                await sendNotification({
                    type: 2,
                    title: object.name,
                    whom: executor?object.executor:object.customer,
                    who: user._id,
                    message: executor?'Исполнитель принят':'Заказ принят',
                    url: `${process.env.URL.trim()}/order/${object._id}`,
                    order: object._id,
                    chat: chat._id
                })
            }
        }
        return 'OK'
    },
    responseOrder: async(parent, { _id, message }, {user}) => {
        if('client'===user.role) {
            let allowSubcategories = []
            if(user.role==='client')
                for (let i = 0; i < user.specializations.length; i++) {
                    if(user.specializations[i].end>new Date()&&user.specializations[i].enable)
                        allowSubcategories.push(user.specializations[i].subcategory)
                }
            let object = await Order.findOne({
                _id,
                status: 'активный',
                executor: null,
                subcategory: {$in: allowSubcategories},
                customer: {$ne: user._id},
                responsedUsers: {$ne: user._id}
            })
            if(object) {

                object.responsedUsers.push(user._id)
                await object.save()

                await sendNotification({
                    type: 1,
                    title: object.name,
                    whom: object.customer,
                    who: user._id,
                    message: message?message:'Готов(а) выполнить заказ',
                    order: object._id,
                    url: `${process.env.URL.trim()}/order/${object._id}`
                })
            }
        }
        return 'OK'
    },
    cancelOrder: async(parent, { _id, message }, {user}) => {
        if('client'===user.role) {
            let object = await Order.findOne({
                _id,
                status: 'принят',
                $or: [
                    {executor: user._id},
                    {customer: user._id}
                ]
            })
            if(object) {
                object.status = 'отмена'
                if(object.executor.toString()===user._id.toString())
                    object.cancelExecutor = message?message:'Заказ отменен исполнителем'
                else
                    object.cancelCustomer = message?message:'Заказ отменен заказчиком'
                await object.save()

                if(!(await Order.findOne({
                        status: 'принят',
                        $or: [
                            {$and: [
                                {executor: object.executor},
                                {customer: object.customer}
                            ]},
                            {$and: [
                                {customer: object.executor},
                                {executor: object.customer}
                            ]},
                        ]
                    }).select('_id').lean())) {
                    if(!(await Order.findOne({
                            status: 'принят',
                            $or: [
                                {$and: [
                                    {executor: object.executor},
                                    {customer: object.customer}
                                ]},
                                {$and: [
                                    {customer: object.executor},
                                    {executor: object.customer}
                                ]},
                            ]
                        }).select('_id').lean())) {
                        await Chat.deleteMany({
                            $or: [
                                {part1: object.executor, part2: object.customer},
                                {part2: object.executor, part1: object.customer}
                            ]
                        })
                    }
                }

                await sendNotification({
                    title: message?`Заказ отменен ${object.executor.toString()===user._id.toString()?'исполнителем':'заказчиком'}`:'Заказ отменен',
                    type: 5,
                    whom: object.executor.toString()===user._id.toString()?object.customer:object.executor,
                    who: user._id,
                    message: message?message:`Заказ отменен ${object.executor.toString()===user._id.toString()?'исполнителем':'заказчиком'}`,
                    order: object._id,
                    url: `${process.env.URL.trim()}/order/${object._id}`
                })
            }
        }
        return 'OK'
    },
    confirmOrder: async(parent, { _id }, {user}) => {
        if('client'===user.role) {
            let object = await Order.findOne({
                _id,
                status: 'принят',
                $or: [
                    {executor: user._id},
                    {customer: user._id}
                ]
            })
            if(object) {
                object.status = 'выполнен'
                object.confirm = true
                await object.save()
                if(!(await Order.findOne({
                        status: 'принят',
                        $or: [
                            {$and: [
                                {executor: object.executor},
                                {customer: object.customer}
                            ]},
                            {$and: [
                                {customer: object.executor},
                                {executor: object.customer}
                            ]},
                        ]
                }).select('_id').lean())) {
                    await Chat.deleteMany({
                        $or: [
                            {part1: object.executor, part2: object.customer},
                            {part2: object.executor, part1: object.customer}
                        ]
                    })
                }

                let user = await User.findOne({_id: object.executor})
                user.completedWorks += 1
                await user.save()

                await sendNotification({
                    title: 'Заказ выполнен',
                    type: 4,
                    whom: object.executor.toString()===user._id.toString()?object.customer:object.executor,
                    who: user._id,
                    message: 'Исполнитель выполнил заказ',
                    order: object._id,
                    url: `${process.env.URL.trim()}/order/${object._id}`
                })
            }
        }
        return 'OK'
    },
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;