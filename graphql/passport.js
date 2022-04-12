const { signupuserGQL, signinuserGQL } = require('../module/passport');

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
    signupuser(name: String!, login: String!, password: String!, code: String, isApple: Boolean): Status
    signinuser(login: String!, password: String!): Status
`;

const resolversMutation = {
    signupuser: async(parent, { name, login, password, code, isApple }, {res, req}) => {
        return await signupuserGQL({name, login, password, code, isApple }, res, req);
    },
    signinuser: async(parent, { login, password }, {req, res}) => {
        return await signinuserGQL({ ...req, query: {login, password}}, res);
    },
};

module.exports.resolvers = resolvers;
module.exports.query = query;
module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;