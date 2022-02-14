const Blog = require('../models/blog');
const { saveImage, deleteFile, urlMain } = require('../module/const');

const type = `
  type Blog {
    _id: ID
    createdAt: Date
    image: String
    text: String
    user: User
  }
`;

const query = `
    blogs(user: ID!, skip: Int!): [Blog]
`;

const mutation = `
    addBlog(image: Upload!, text: String!): Blog
    deleteBlog(_id: ID!): String
`;

const resolvers = {
    blogs: async(parent, {user, skip}) => {
            let res = await Blog.find({
                user
            })
                .skip(skip)
                .limit(15)
                .sort('-createdAt')
                .lean()
            return res
    },
};

const resolversMutation = {
    addBlog: async(parent, {image, text}, {user}) => {
        if(user.role==='client'){
            let { stream, filename } = await image;
            filename = await saveImage(stream, filename)
            let object = new Blog({
                image: urlMain+filename, text, user: user._id
            });
            object = await Blog.create(object)
            return object
        }
    },
    deleteBlog: async(parent, { _id }, {user}) => {
        if(['admin', 'client'].includes(user.role)){
            let object = await Blog.findOne({
                _id, ...'client'===user.role?{user: user._id}:{}
            }).select('image').lean()
            if(object) {
                await deleteFile(object.image)
                await Blog.findByIdAndDelete(_id)
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