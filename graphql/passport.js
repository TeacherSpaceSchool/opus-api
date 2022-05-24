const { signinuserGQL, changePhoneGQL } = require('../module/passport');
const { sendSmsPassword } = require('../module/sms');
const User = require('../models/user');
const randomstring = require('randomstring');
const Bonus = require('../models/bonus');

const type = `
  type Status {
    role: String
    status: String
    login: String
    city: String
    _id: ID
    phone: String
    name: String
    specializations: [Specialization]
    unreadBN: UnreadBN
    addresses: [Address]
    verification: Boolean
  }
`;

const query = `
   getStatus: Status
`;

const resolvers = {
    getStatus: async(parent, args, {user}) => {
        return user
    },
};

const mutation = `
    getUserByPhone(phone: String!): String
    changePhone(newPhone: String!, password: String): String
    signinuser(name: String, login: String!, password: String!, code: String, isApple: Boolean): Status
`;

const resolversMutation = {
    changePhone: async(parent, {newPhone, password}, {req, res, user}) => {
        if('client'===user.role) {
            if(!password) {
                user = await User.findOne({login: user.login})
                password = randomstring.generate({length: 6, charset: 'numeric'});
                if (process.env.URL.trim() === 'https://opus.kg')
                    sendSmsPassword(newPhone, password)
                else
                    console.log(password)
                setTimeout(async () => {
                    user = await User.findOne({login: user.login})
                    password = randomstring.generate({length: 6, charset: 'numeric'});
                    user.password = password
                    await user.save()
                }, 5 * 60 * 1000)
                user.password = password
                await user.save()
                return 'OK'
            }
            else
                return await changePhoneGQL({ ...req, query: {login: user.login, password}}, res, { newPhone });
        }
        return 'ERROR'
    },
    getUserByPhone: async(parent, { phone }, {req}) => {
        let user = await User.findOne({login: phone})
        if(user&&['admin', 'manager'].includes(user.role))
            return 'enterEmployment'
        let password = randomstring.generate({length: 6, charset: 'numeric'});
        if(process.env.URL.trim()==='https://opus.kg')
            sendSmsPassword(phone, password)
        else
            console.log(password)
        setTimeout(async ()=>{
            user = await User.findOne({login: phone})
            password = randomstring.generate({length: 6, charset: 'numeric'});
            user.password = password
            await user.save()
        }, 5*60*1000)
        if(!user) {
            user = new User({
                login: phone,
                role: 'client',
                status: 'active',
                password: password,
                name: '',
                city: req.cookies['city'] ? req.cookies['city'] : 'Бишкек',
                email: '',
                info: '',
                reiting: [],
                specializations: [],
                achievements: [],
                completedWorks: 0,
                prices: [],
                certificates: [],
                favorites: []
            });
            user = await User.create(user);
            let code = randomstring.generate({length: 4, charset: 'alphanumeric'})
            while (await Bonus.findOne({code}).select('_id').lean())
                code = randomstring.generate({length: 4, charset: 'alphanumeric'})
            let bonus = new Bonus({
                code,
                count: 0,
                user: user._id
            });
            await Bonus.create(bonus);
            return 'reg'
        }
        else {
            user.password = password
            await user.save()
            if(user.name)
                return 'enter'
            else
                return 'reg'
        }
    },
    signinuser: async(parent, { login, password, name, code, isApple }, {req, res}) => {
        return await signinuserGQL({ ...req, query: {login, password}}, res, {name, code, isApple});
    },
};

module.exports.resolvers = resolvers;
module.exports.query = query;
module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;