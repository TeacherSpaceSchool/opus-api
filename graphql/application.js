const Application = require('../models/application');
const Subcategory = require('../models/subcategory');
const Notification = require('../models/notification');
const User = require('../models/user');
const { saveImage, deleteFile, urlMain } = require('../module/const');
const { sendNotification } = require('../module/notification');
const { sendMessageByAdmin } = require('../module/chat');

const type = `
  type Application {
    _id: ID
    createdAt: Date
    status: String
    documents: [String]
    comments: [String]
    info: String
    unread: Boolean
    user: User
    category: Category
    subcategory: Subcategory
    approvedUser: User
  }
`;

const query = `
    applications(status: String, search: String, skip: Int!, limit: Int): [Application]
    applicationsCount(search: String): [Int]
    application(_id: ID!): Application
`;

const mutation = `
    addApplication(uploads: [Upload], info: String!, category: ID!, subcategory: ID!): String
    setApplication(_id: ID!, approve: Boolean, documents: [String], uploads: [Upload], comments: [String], info: String): String
    deleteApplication(_id: ID!): String
`;

const resolvers = {
    applicationsCount: async(parent, {search}, {user}) => {
        if(['manager', 'admin'].includes(user.role)) {
            let searchedUsers;
            if(search)
                searchedUsers = await User.find({
                    name: {'$regex': search, '$options': 'i'},
                })
                    .distinct('_id')
                    .lean()
            return [
                await Application.countDocuments({
                    ...search?{user: {$in: searchedUsers}}:{},
                    status: 'активный'
                })
                    .lean(),
                await Application.countDocuments({
                    ...search?{user: {$in: searchedUsers}}:{},
                    status: 'принят'
                })
                    .lean(),
            ]
        }
    },
    applications: async(parent, {search, status, skip, limit}, {user}) => {
        if(['manager', 'admin', 'client'].includes(user.role)) {
            let searchedUsers
            if(search)
                searchedUsers = await User.find({
                    name: {'$regex': search, '$options': 'i'},
                })
                    .distinct('_id')
                    .lean()
            return await Application.find({
                ...search?{user: {$in: searchedUsers}}:{},
                ...status?{status}:{},
                ...'client'===user.role?{user: user._id}:{}
            })
                .sort('-updatedAt')
                .skip(skip)
                .limit(limit?limit:15)
                .populate({
                    path: 'user',
                    select: '_id name'
                })
                .populate({
                    path: 'category',
                    select: '_id name'
                })
                .populate({
                    path: 'subcategory',
                    select: '_id name'
                })
                .populate({
                    path: 'approvedUser',
                    select: '_id name role'
                })
                .lean()
        }
    },
    application: async(parent, {_id}, {user}) => {
        if(['manager', 'admin', 'client'].includes(user.role)) {
            let application = await Application
                .findOne({
                    _id,
                    ...'client'===user.role?{user: user._id}:{}
                })
                .populate({
                    path: 'user',
                    select: '_id name'
                })
                .populate({
                    path: 'category',
                    select: '_id name'
                })
                .populate({
                    path: 'subcategory',
                    select: '_id name'
                })
                .populate({
                    path: 'approvedUser',
                    select: '_id name role'
                })
            if('client'===user.role&&application.unread){
                await Application.update({_id, user: user._id}, {unread: false})
            }
            return application
        }
    },
};

const resolversMutation = {
    addApplication: async(parent, {uploads, info, category, subcategory}, {user}) => {
        if(user.role==='client'){
            let documents = []
            for(let i = 0; i<uploads.length;i++) {
                let { stream, filename } = await uploads[i];
                filename = await saveImage(stream, filename)
                documents.push(urlMain+filename)
            }
            subcategory = await Subcategory.findOne({_id: subcategory})
                .select('_id autoApplication')
                .lean()
            let object = new Application({
                status: 'активный',
                documents,
                comments: [],
                info,
                unread: false,
                user: user._id,
                category,
                subcategory: subcategory._id
            });
            await Application.create(object)
            if(subcategory.autoApplication) {
                if(!JSON.stringify(user.specializations).includes(subcategory._id.toString())) {
                    let _user = await User.findOne({_id: user._id})
                    _user.specializations = [
                        ..._user.specializations,
                        {
                            category,
                            subcategory: subcategory._id,
                            end: new Date(),
                            discount: 0,
                            enable: true
                        }
                    ]
                    _user.specializations = [..._user.specializations]
                    await sendMessageByAdmin({text: 'Привет1', user: _user._id, type: 'link'})
                    await _user.save()
                }
            }
            return 'OK'
        }
    },
    setApplication: async(parent, {_id, approve, documents, uploads, comments, info}, {user}) => {
        if(['admin', 'manager', 'client'].includes(user.role)){
            let object = await Application.findOne({
                _id,
                ...'client'===user.role?{user: user._id}:{},
                status: 'активный'
            })

            if(['admin', 'manager'].includes(user.role)) {
                if(comments) {
                    object.unread = true
                    object.comments = comments
                    await sendNotification({
                        title: 'Заявка на сециалиста',
                        type: 0,
                        whom: object.user,
                        message: 'Ваша заявка прокоментирована',
                        application: object._id,
                        url: `${process.env.URL.trim()}/application/${object._id}`
                    })
                }
                if(approve) {
                    object.unread = true
                    object.status = 'принят'
                    object.approvedUser = user._id
                    await sendNotification({
                        title: 'Заявка на сециалиста',
                        type: 0,
                        whom: object.user,
                        message: 'Ваша заявка принята',
                        application: object._id,
                        url: `${process.env.URL.trim()}/application/${object._id}`
                    })

                    let _user = await User.findOne({_id: object.user})
                    if(!JSON.stringify(_user.specializations).includes(object.subcategory.toString())) {
                        _user.specializations = [
                            ..._user.specializations,
                            {
                                category: object.category,
                                subcategory: object.subcategory,
                                end: new Date(),
                                discount: 0,
                                enable: true
                            }
                        ]
                        _user.specializations = [..._user.specializations]
                        await sendMessageByAdmin({text: 'Привет2', user: _user._id, type: 'text'})
                        await _user.save()
                    }

                }
            }

            if('client'===user.role) {
                if(info)
                    object.info = info

                if (documents)
                    for (let i = 0; i < object.documents.length; i++)
                        if (!documents.includes(object.documents[i])) {
                            await deleteFile(object.documents[i])
                            object.documents.splice(i, 1)
                            i -= 1
                        }
                if (uploads)
                    for (let i = 0; i < uploads.length; i++) {
                        let {stream, filename} = await uploads[i];
                        filename = await saveImage(stream, filename)
                        object.documents = [urlMain + filename, ...object.documents]
                    }

            }
            await object.save();
            return 'OK'
        }
    },
    deleteApplication: async(parent, { _id }, {user}) => {
        if(['admin', 'client'].includes(user.role)){
            let object = await Application.findOne({
                _id,
                ...'client'===user.role?{user: user._id}:{},
                status: 'активный'
            }).select('documents').lean()
            if(object) {
                await Notification.deleteMany({
                    application: _id
                })
                for (let i = 0; i < object.documents.length; i++) {
                    await deleteFile(object.documents[i])
                }
                await Application.findByIdAndDelete(_id)
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