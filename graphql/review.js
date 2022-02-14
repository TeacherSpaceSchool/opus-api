const Review = require('../models/review');
const Order = require('../models/order');
const User = require('../models/user');
const { saveImage, deleteFile, urlMain, checkFloat } = require('../module/const');

const type = `
  type Review {
    _id: ID
    createdAt: Date
    reiting: Float
    images: [String]
    info: String
    who: User
    whom: User
  }
`;

const query = `
    reviews(who: ID, whom: ID, skip: Int!): [Review]
`;

const mutation = `
    canReview(whom: ID!): Boolean
    addReview(reiting: Float!, uploads: [Upload], info: String!, whom: ID!): Review
    deleteReview(_id: ID!): String
`;

const resolvers = {
    reviews: async(parent, {who, whom, skip}) => {
        let now = new Date()
        now.setMinutes(now.getMinutes()-30)
        return await Review.find({
            ...who?{who}:{},
            ...whom?{whom}:{},
            createdAt: {$lte: now}
        })
            .sort('-createdAt')
            .skip(skip)
            .limit(15)
            .populate({
                path: 'who',
                select: '_id name avatar'
            })
            .populate({
                path: 'whom',
                select: '_id name avatar'
            })
            .lean()
    },
};

const resolversMutation = {
    addReview: async(parent, {reiting, uploads, info, whom}, {user}) => {
        if(user.role==='client'){
            let order = await Order.findOne({
                customer: user._id,
                executor: whom,
                review: {$ne: true},
                status: 'выполнен'
            })
            if(order) {
                let images = []
                if (uploads) {
                    for(let i = 0; i<uploads.length;i++) {
                        let {stream, filename} = await uploads[i];
                        filename = await saveImage(stream, filename)
                        images.push(urlMain + filename)
                    }
                }
                let object = new Review({
                    reiting,
                    images,
                    info,
                    who: user._id,
                    whom: order.executor,
                });
                object = await Review.create(object)

                order.review = true
                await order.save()

                let _user = await User.findOne({_id: whom})
                _user.reiting = [..._user.reiting, reiting]
                let avgReiting = 0
                for (let i = 0; i < _user.reiting.length; i++) {
                    avgReiting += _user.reiting[i]
                }
                _user.avgReiting = checkFloat(avgReiting/_user.reiting.length)
                await _user.save()

                return object
            }
        }
    },
    deleteReview: async(parent, { _id }, {user}) => {
        if(['admin', 'client'].includes(user.role)) {
            let object = await Review.findOne({
                ...'client'===user.role?{who: user._id}:{},
                _id
            }).select('images').lean()
            if(object) {
                for (let i = 0; i < object.images.length; i++) {
                    await deleteFile(object.images[i])
                }
                await Review.findByIdAndDelete(_id)
            }
        }
        return 'OK'
    },
    canReview: async(parent, { whom }, {user}) => {
        if('client'===user.role) {
            let object = await Order.findOne({
                customer: user._id,
                executor: whom,
                review: {$ne : true},
                status: 'выполнен'
            }).select('_id').lean()
            return !!object
        }
        return false
    },
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;