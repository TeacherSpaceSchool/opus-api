const Bonus = require('../models/bonus');
const BonusHistory = require('../models/bonusHistory');
const { addBonus } = require('../module/bonus');

const type = `
  type Bonus {
    _id: ID
    createdAt: Date
    code: String
    count: Int
    user: User
  }
  type BonusHistory {
    _id: ID
    createdAt: Date
    count: Int
    what: String
    invited: User
    user: User
  }
`;

const query = `
    bonus(user: ID): Bonus
    bonusHistory(user: ID, skip: Int!): [BonusHistory]
`;

const mutation = `
    addBonus(count: Int!, user: ID!): BonusHistory
`;

const resolvers = {
    bonusHistory: async(parent, {user, skip}, ctx) => {
        if(['admin', 'client'].includes(ctx.user.role)) {
            if('client'===ctx.user.role) user = ctx.user._id
            return await BonusHistory.find({
                user
            })
                .populate({
                    path: 'invited',
                    select: '_id name'
                })
                .skip(skip)
                .limit(15)
                .sort('-createdAt')
                .lean()
        }
    },
    bonus: async(parent, {user}, ctx) => {
        if(['admin', 'client'].includes(ctx.user.role)) {
            if('client'===ctx.user.role) user = ctx.user._id
            return await Bonus
                .findOne({
                    user
                })
                .populate({
                    path: 'user',
                    select: '_id name'
                })
                .lean()
        }
    },
};

const resolversMutation = {
    addBonus: async(parent, {count, user}, ctx) => {
        if(ctx.user.role==='admin')
            return await addBonus({count, what: 'Бонус от OPUS.KG', user})
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;