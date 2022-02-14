const Complaint = require('../models/complaint');

const type = `
  type Complaint {
    _id: ID
    createdAt: Date
    taken: Boolean
    text: String
     user: User
     who: User
 }
`;

const query = `
    complaints(skip: Int!, filter: String): [Complaint]
    complaintsCount(filter: String): Int
`;

const mutation = `
    addComplaint(text: String!): Complaint
    acceptComplaint(_id: ID!): String
    deleteComplaint(_id: ID!): String
`;

const resolvers = {
    complaints: async(parent, {skip, filter}, {user}) => {
        if(['admin', 'client'].includes(user.role)) {
            return await Complaint.find({
                ...filter==='активный' ? {taken: false} : {},
                ...user.role==='client'? {user: user._id} : {}
            })
                .skip(skip)
                .limit(15)
                .sort('-createdAt')
                .populate({
                    path: 'user',
                    select: 'name _id'
                })
                .lean()
        }
    },
    complaintsCount: async(parent, {filter}, {user}) => {
        if(['admin', 'client'].includes(user.role)) {
            return await Complaint.countDocuments({
                ...filter === 'активный' ? {taken: false} : {},
                ...user.role==='client'? {user: user._id} : {}
            })
                .lean()
        }
    },
};

const resolversMutation = {
    addComplaint: async(parent, {text}, {user}) => {
        if('admin'!==user.role) {
            let _object = new Complaint({
                user: user._id,
                taken: false,
                text
            });
            _object = await Complaint.create(_object)
            return _object
        }
    },
    acceptComplaint: async(parent, {_id}, {user}) => {
        if('admin'===user.role) {
            let object = await Complaint.findById(_id)
            object.taken = true
            object.who = user._id
            await object.save();
            return 'OK'
        }
        return 'ERROR'
    },
    deleteComplaint: async(parent, { _id }, {user}) => {
        if('admin'===user.role) {
            await Complaint.deleteOne({_id})
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