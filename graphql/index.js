const { gql, ApolloServer,  } = require('apollo-server-express');
const { RedisPubSub } = require('graphql-redis-subscriptions');
const pubsub = new RedisPubSub();
module.exports.pubsub = pubsub;
const Blog = require('./blog');
const Contact = require('./contact');
const MainSubcategory = require('./mainSubcategory');
const PushNotification = require('./pushNotification');
const Error = require('./error');
const Faq = require('./faq');
const Application = require('./application');
const Bonus  = require('./bonus');
const Category  = require('./category');
const Chat  = require('./chat');
const Notification = require('./notification');
const Order = require('./order');
const Payment = require('./payment');
const Statistic = require('./statistic');
const User = require('./user');
const Review = require('./review');
const Passport = require('./passport');
const Complaint = require('./complaint');
const Subcategory = require('./subcategory');
const { verifydeuserGQL } = require('../module/passport');
const { GraphQLScalarType } = require('graphql');
const ModelsError = require('../models/error');
const { withFilter } = require('graphql-subscriptions');
const RELOAD_DATA = 'RELOAD_DATA';

const typeDefs = gql`
    scalar Date
    type ReloadData {
        users: [String]
        roles: [String]
        subcategory: String
        notification: Notification
        message: Message
        mailing: Boolean
    }
  type Address {
    address: String
    apartment: String
    geo: [Float]
  }
  input AddressInput {
    address: String
    apartment: String
    geo: [Float]
  }
    ${Error.type}
    ${Application.type}
    ${Bonus.type}
    ${Category.type}
    ${Statistic.type}
    ${Chat.type}
    ${Notification.type}
    ${Order.type}
    ${Payment.type}
    ${User.type}
    ${Review.type}
    ${Complaint.type}
    ${Faq.type}
    ${Subcategory.type}
    ${Blog.type}
    ${Contact.type}
    ${MainSubcategory.type}
    ${PushNotification.type}
    ${Passport.type}
    type Mutation {
        ${Application.mutation}
        ${Bonus.mutation}
        ${Category.mutation}
        ${Chat.mutation}
        ${Error.mutation}
        ${Order.mutation}
        ${Payment.mutation}
        ${Review.mutation}
        ${Complaint.mutation}
        ${Subcategory.mutation}
        ${Faq.mutation}
        ${Blog.mutation}
        ${Contact.mutation}
        ${MainSubcategory.mutation}
        ${PushNotification.mutation}
        ${Passport.mutation}
        ${User.mutation}
    }
    type Query {
        ${Error.query}
        ${Application.query}
        ${Bonus.query}
        ${Category.query}
        ${Statistic.query}
        ${Chat.query}
        ${Notification.query}
        ${Order.query}
        ${Payment.query}
        ${User.query}
        ${Review.query}
        ${Faq.query}
        ${Complaint.query}
        ${Subcategory.query}
        ${Blog.query}
        ${Contact.query}
        ${MainSubcategory.query}
        ${PushNotification.query}
        ${Passport.query}
    }
    type Subscription {
        reloadData: ReloadData
    }
`;

const resolvers = {
    Date: new GraphQLScalarType({
        name: 'Date',
        description: 'Date custom scalar type',
        parseValue(value) {
            return new Date(value); // value from the client
        },
        serialize(value) {
            return new Date(value).getTime();
        },
        parseLiteral(ast) {
            if (ast.kind === Kind.INT) {
                return new Date(ast.value)
            }
            return null;
        },
    }),
    Query: {
        ...Error.resolvers,
        ...Application.resolvers,
        ...Bonus.resolvers,
        ...Category.resolvers,
        ...Statistic.resolvers,
        ...Chat.resolvers,
        ...Notification.resolvers,
        ...Order.resolvers,
        ...Payment.resolvers,
        ...User.resolvers,
        ...Review.resolvers,
        ...Complaint.resolvers,
        ...Faq.resolvers,
        ...Subcategory.resolvers,
        ...Blog.resolvers,
        ...Contact.resolvers,
        ...MainSubcategory.resolvers,
        ...PushNotification.resolvers,
        ...Passport.resolvers
    },
    Mutation: {
        ...Error.resolversMutation,
        ...Application.resolversMutation,
        ...Bonus.resolversMutation,
        ...Category.resolversMutation,
        ...Chat.resolversMutation,
        ...Subcategory.resolversMutation,
        ...Order.resolversMutation,
        ...Payment.resolversMutation,
        ...User.resolversMutation,
        ...Review.resolversMutation,
        ...Faq.resolversMutation,
        ...Complaint.resolversMutation,
        ...Blog.resolversMutation,
        ...Contact.resolversMutation,
        ...MainSubcategory.resolversMutation,
        ...PushNotification.resolversMutation,
        ...Passport.resolversMutation,
    },
    Subscription: {
        reloadData: {
            subscribe: withFilter(
                () => pubsub.asyncIterator(RELOAD_DATA),
                (payload, variables, {user} ) => {
                    let subcategory = false
                    if(payload.reloadData.subcategory&&user.specializations&&user.specializations.length) {
                        let subcategories = []
                        for (let i = 0; i < user.specializations.length; i++) {
                            if(user.specializations[i].end>new Date()&&user.specializations[i].enable)
                                subcategories.push(user.specializations[i].subcategory.toString())
                        }
                        subcategory = subcategories.includes(payload.reloadData.subcategory.toString())
                    }
                    return user&&user.role&&user._id&&(
                        payload.reloadData.roles&&payload.reloadData.roles.includes(user.role)
                        ||
                        payload.reloadData.users&&payload.reloadData.users.includes(user._id.toString())
                        ||
                        subcategory
                    )
                },
            )
        },
    }
};

const run = (app)=>{
    const server = new ApolloServer({
        playground: false,
        typeDefs,
        resolvers,
        subscriptions: {
            keepAlive: 1000,
            onConnect: async (connectionParams) => {
                if (connectionParams&&connectionParams.authorization) {
                    let user = await verifydeuserGQL({headers: {authorization: connectionParams.authorization}}, {})
                    return {
                        user: user,
                    }
                }
                else return {
                    user: {}
                }
                //throw new Error('Missing auth token!');
            },
            onDisconnect: (webSocket, context) => {
                // ...
            },
        },
        context: async (ctx) => {
            if (ctx.connection) {
                return ctx.connection.context;
            }
            else if(ctx&&ctx.req) {
                ctx.res.header('ACCEPT-CH', 'UA-Full-Version, UA-Mobile, UA-Model, UA-Arch, UA-Platform, ECT, Device-Memory, RTT');
                let user = await verifydeuserGQL(ctx.req, ctx.res)
                return {req: ctx.req, res: ctx.res, user: user};
            }
        },
        formatError: async (err) => {
            console.error(err)
            let object = new ModelsError({
                err: `gql: ${err.message}`,
                path: JSON.stringify(err.path)
            });
            /*if(!object.path&&err.extensions&&err.extensions.exception&&err.extensions.exception.stacktrace)
                object.path = JSON.stringify(err.extensions.exception.stacktrace)*/
            await ModelsError.create(object)
            return err;
        }
    })
    server.applyMiddleware({ app, path : '/graphql', cors: false })
    return server
    //server.listen().then(({ url }) => {console.log(`🚀  Server ready at ${url}`);});
}

module.exports.run = run;
