const User = require('../models/user');
const jwtsecret = 'HZRD8YZtT14pbGZGlZSH';
const jwt = require('jsonwebtoken');
const RemindPassword = require('../models/remindPassword');
const { saveImage, deleteFile, urlMain, emailMain, emailPass } = require('../module/const');
const { SingletonRedis } = require('../module/redis')
const nodemailer = require('nodemailer');
const randomstring = require('randomstring');

const type = `
  type User {
    _id: ID
    createdAt: Date
    updatedAt: Date
    login: String
    role: String
    status: String
    device: String
    notification: Boolean
    online: Boolean
    lastActive: Date
    certificates: [String]
    name: String
    city: String
    email: String
    addresses: [Address]
    info: String
    avatar: String
    reiting: [Float]
    geo: [Float]
    specializations: [Specialization]
    achievements: [String]
    completedWorks: Int
    prices: [Price]
    favorites: [ID]
    unreadBN: UnreadBN
  }
  type UnreadBN {
    notifications0: Boolean
    notifications1: Boolean
  }
  type Specialization {
    category: ID
    subcategory: ID
    end: Date
    discount: Int
    enable: Boolean
  }
  input SpecializationInput {
    category: ID
    subcategory: ID
    end: Date
    discount: Int
    enable: Boolean
  }
  type Price {
    name: String
    price: Int
  }
  input PriceInput {
    name: String
    price: Int
  }
`;

const query = `
    users(favorite: Boolean, employment: Boolean, search: String, category: ID, subcategory: ID, skip: Int!, status: String, limit: Int): [User]
    usersCount(favorite: Boolean, employment: Boolean, search: String, category: ID, subcategory: ID, status: String): Int
    user(_id: ID!): User
    checkRemindPassword(code: String!): String
`;

const mutation = `
    addEmployment(login: String, password: String, name: String, city: String, role: String, email: String): String
    setUser(_id: ID!, addresses: [AddressInput], certificates: [String], uploadCertificates: [Upload], login: String, password: String, status: String, name: String, city: String, email: String, info: String, avatar: Upload, specializations: [SpecializationInput], achievements: [String], prices: [PriceInput]): String
    favoriteUser(_id: ID!): String
    setDevice(device: String!): String
    remindPassword(email: String, code: String, password: String): String
    onlineUser(geo: [Float]): String
    readUser(field: String): String
`;

const resolvers = {
    users: async(parent, {favorite, employment, search, category, subcategory, skip, status, limit}, {user, req}) => {
        let now = new Date()
        let city = req.cookies['city']?req.cookies['city']:'Бишкек'
         let res =  await User.find({
            ...user.role!=='admin' ? {status: 'active'} : status ? {status} : {},
            ...favorite ? {
                favorites: user._id.toString()
            } : {},
            ...search ? {name: {'$regex': search, '$options': 'i'}} : {},
            ...category ? {specializations: {$elemMatch: {category}}} : {},
             ...subcategory?{specializations: {$elemMatch: {$and: [
                 {subcategory},
                 {end: {$gt: now}},
                 {enable: true}
             ]}}}:{},
             city,
             _id: {$ne: user._id},
             ...employment&&user.role==='admin'?{role: 'manager'}:{role: 'client'}
        })
            .skip(skip)
            .limit(limit?limit:15)
             .sort('-avgReiting')
             .sort('name')
            .lean()
        let online
        for(let i=0; i<res.length; i++) {
            online = await new SingletonRedis().getOnline(res[i]._id)
            res[i].online = online && (((now - new Date(online)) / 1000 / 60) <= 6)
            res[i].geo = await new SingletonRedis().getGeo(res[i]._id)
        }
        return res
    },
    usersCount: async(parent, {favorite, employment, search, category, subcategory, status}, {user, req}) => {
        let now = new Date()
        let city = req.cookies['city']?req.cookies['city']:'Бишкек'
        return await User.countDocuments({
            ...user.role!=='admin' ? {status: 'active'} : status ? {status} : {},
            ...favorite?{favorites: user._id.toString()}:{},
            ...search?{name: {'$regex': search, '$options': 'i'}}:{},
            ...category?{specializations: {$elemMatch: {category}}}:{},
            ...subcategory?{specializations: {$elemMatch: {$and: [
                {subcategory},
                {end: {$gt: now}},
                {enable: true}
            ]}}}:{},
            city,
            _id: {$ne: user._id},
            ...employment&&user.role==='admin'?{role: 'manager'}:{role: 'client'}
        })
            .lean()
    },
    user: async(parent, {_id}) => {
        let res = await User.findOne({_id}).lean()
        let online = await new SingletonRedis().getOnline(res._id)
        res.online = online && (((new Date() - new Date(online)) / 1000 / 60) <= 6)
        res.geo = await new SingletonRedis().getGeo(res._id)
        return res
    },
    checkRemindPassword: async(parent, {code}) => {
        let remindPassword = await RemindPassword.findOne({code}).lean()
        if(remindPassword&&((new Date()-remindPassword.createdAt)/1000/60)<10)
            return 'OK'
        return 'ERROR'
    },
};

const resolversMutation = {
    addEmployment: async(parent, {login, password, name, role, city, email}, {user}) => {
        if(user.role==='admin'){
            let user = new User({
                login: login.trim(),
                status: 'active',
                role,
                password,
                name,
                city,
                email,
                info: '',
                reiting: [],
                specializations: [],
                achievements: [],
                completedWorks: 0,
                prices: [],
                certificates: [],
                favorites: []
            });
            await User.create(user);
            return 'OK'
        }
    },
    setUser: async(parent, {_id, addresses, certificates, uploadCertificates, login, status, password, name, city, email, info, avatar, specializations, achievements, prices}, {user, res}) => {
        if(['admin', 'client'].includes(user.role)) {
            if('client'===user.role)
                _id = user._id
            let object = await User.findOne({
                _id
            })
            if(avatar){
                if(object.avatar)
                    await deleteFile(object.avatar)
                let {stream, filename} = await avatar;
                filename = await saveImage(stream, filename)
                object.avatar = urlMain + filename
            }
            if(login) {
                object.login = login
                if(object._id.toString()===user._id.toString()) {
                    const payload = {
                        id: object._id,
                        login: object.login,
                        role: object.role
                    };
                    const token = await jwt.sign(payload, jwtsecret); //здесь создается JWT
                    await res.cookie('jwt', token, {maxAge: 10000*24*60*60*1000 });
                }
            }

            if(!object.certificates)
                object.certificates = []
            if (certificates)
                for (let i = 0; i < object.certificates.length; i++)
                    if (!certificates.includes(object.certificates[i])) {
                        await deleteFile(object.certificates[i])
                        object.certificates.splice(i, 1)
                        i -= 1
                    }
            if (uploadCertificates)
                for (let i = 0; i < uploadCertificates.length; i++) {
                    let {stream, filename} = await uploadCertificates[i];
                    filename = await saveImage(stream, filename)
                    object.certificates = [urlMain + filename, ...object.certificates]
                }

            if(password) object.password = password
            if(addresses) object.addresses = addresses
            if(name) object.name = name
            if(city) {
                object.city = city
                if(object._id.toString()===user._id.toString())
                    await res.cookie('city', city, {maxAge: 10000*24*60*60*1000 });
            }
            if(email&&!(await User.findOne({email}))) object.email = email
            if(info) object.info = info
            if(prices) object.prices = prices
            if('admin'===user.role){
                if(status) object.status = status
                if(achievements) object.achievements = achievements
            }
            if(specializations) {
                if('admin'===user.role) {
                    let addedCategory = [], removedCategory = [], addedSubcategory = [], removedSubcategory = [], sSpecializations = JSON.stringify(specializations), sObjectSpecializations = JSON.stringify(object.specializations)
                    for (let i = 0; i < specializations.length; i++) {
                        if (!sObjectSpecializations.includes(JSON.stringify(specializations[i].category)))
                            addedCategory.push(specializations[i].category)
                        if (!sObjectSpecializations.includes(JSON.stringify(specializations[i].subcategory)))
                            addedSubcategory.push(specializations[i].subcategory)
                    }
                    for (let i = 0; i < object.specializations.length; i++) {
                        if (!sSpecializations.includes(JSON.stringify(object.specializations[i].category)))
                            removedCategory.push(object.specializations[i].category)
                        if (!sSpecializations.includes(JSON.stringify(object.specializations[i].subcategory)))
                            removedSubcategory.push(object.specializations[i].subcategory)
                    }
                    object.specializations = specializations
                }
                else {
                    let approve = true, _specializations = JSON.stringify(object.specializations)
                    for (let i = 0; i < specializations.length; i++)
                        approve = _specializations.includes(specializations[i].subcategory.toString())&&_specializations.includes(JSON.stringify(specializations[i].end))&&_specializations.includes(specializations[i].discount.toString())
                    if(approve)
                        object.specializations = specializations
                }
            }
            await object.save();
            return 'OK'
        }
    },
    favoriteUser: async(parent, {_id}, {user}) => {
        if(user.role==='client'){
            let object = await User.findOne({_id})
            let userId = user._id.toString()
            if(object.favorites.includes(userId))
                object.favorites.splice(object.favorites.indexOf(userId), 1)
            else
                object.favorites.push(userId)
            await object.save();
            return 'OK'
        }
    },
    setDevice: async(parent, {device}, {user}) => {
        if(user.role==='client') {
            let object = await User.findOne({
                _id: user._id
            })
            object.device = device
            object.lastActive = new Date()
            await object.save();
            return 'OK'
        }
    },
    remindPassword: async(parent, {email, code, password}) => {
        if(email) {
            let user = await User.findOne({
                email
            }).select('_id').lean()
            if (user) {
                await RemindPassword.deleteMany({user: user._id})
                let code = randomstring.generate({length: 20, charset: 'alphanumeric'})
                while (await RemindPassword.findOne({code}).select('_id').lean())
                    code = randomstring.generate({length: 20, charset: 'alphanumeric'})
                let remindPassword = new RemindPassword({
                    code,
                    user: user._id
                });
                await RemindPassword.create(remindPassword);
                let transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: emailMain,
                        pass: emailPass
                    },
                    tls: {
                        rejectUnauthorized: false
                    }
                });
                let mailOptions = {
                    from: emailMain,
                    to: email,
                    subject: 'Восстановление пароля',
                    text: `Вы запросили восстановление Вашего пароля OPUS.KG.\nЕсли Вы этого не делали, проигнорируйте это письмо.\nЧтобы поменять пароль на другой, пройдите по этой ссылке, ссылка действует в течение 10 минут:\n\n${process.env.URL}/remindpassword/${code}\n\nС уважением, Администрация OPUS.KG`
                };
                transporter.sendMail(mailOptions, function (error, info) {
                    if (error)
                        console.error(error);
                    else
                        console.log('Email sent: ' + info.response);
                });
                return 'OK'
            }
        }
        else if(code&&password.length>=8) {
            let remindPassword = await RemindPassword.findOne({
                code
            }).select('user createdAt').lean()
            if(remindPassword&&((new Date()-remindPassword.createdAt)/1000/60)<10){
                let user = await User.findOne({
                    _id: remindPassword.user
                })
                user.password = password
                await user.save()
                await RemindPassword.deleteMany({code})
                return 'OK'
            }
        }
        return 'ERROR'
    },
    readUser: async(parent, {field}, {user}) => {
        if(user) {
            user = await User.findById(user._id).select('unreadBN')
            if(field==='all')
                user.unreadBN = {}
            else {
                let unreadBN = {...user.unreadBN}
                unreadBN[field] = false
                user.unreadBN = unreadBN
            }
            await user.save()
            return 'OK'
        }
    },
    onlineUser: async(parent, {geo}, {user}) => {
        if(user) {
            await new SingletonRedis().setOnline(user._id, geo)
            return 'OK'
        }
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;