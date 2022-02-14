const Faq = require('../models/faq');
const { saveFile, deleteFile, urlMain } = require('../module/const');

const type = `
  type Faq {
    _id: ID
    createdAt: Date
    url: String
    title: String
    video: String
    roles:  [String]
  }
`;

const query = `
    faqs(search: String, skip: Int): [Faq]
`;

const mutation = `
    addFaq(file: Upload, title: String!, roles: [String]!, video: String): Faq
    setFaq(_id: ID!, file: Upload, title: String, roles: [String], video: String): String
    deleteFaq(_id: ID!): String
`;

const resolvers = {
    faqs: async(parent, {search, skip}, {user}) => {
        return await Faq.find({
            title: {'$regex': search, '$options': 'i'},
            ...user.role==='admin'?
                {}
                :
                user.role?
                    user.specializations.length?
                        {$or: [{roles: 'клиент'}, {roles: 'исполнитель'}]}
                        :
                        user.role==='client'?
                            {roles: 'клиент'}
                            :
                            {roles: 'сотрудник'}
                    :
                    {roles: 'гость'}
        })
            .sort('-title')
            .skip(skip != undefined ? skip : 0)
            .limit(skip != undefined ? 15 : 10000000000)
            .lean()
    }
};

const resolversMutation = {
    addFaq: async(parent, {file, title, video, roles}, {user}) => {
        if(user.role==='admin') {
            let object = new Faq({
                title,
                roles,
                video
            });
            if (file) {
                let {stream, filename} = await file;
                filename = await saveFile(stream, filename)
                object.url = urlMain+filename
            }
            object = await Faq.create(object)
            return object
        }
    },
    setFaq: async(parent, {_id, file, title, video, roles}, {user}) => {
        if(user.role==='admin') {
            let object = await Faq.findById(_id)
            if (file) {
                let {stream, filename} = await file;
                if(object.url) await deleteFile(object.url)
                 filename = await saveFile(stream, filename)
                object.url = urlMain + filename
            }
            if(title) object.title = title
            if(video) object.video = video
            if(roles) object.roles = roles
            await object.save();
        }
        return 'OK'
    },
    deleteFaq: async(parent, { _id }, {user}) => {
        if(user.role==='admin'){
            let object = await Faq.findOne({_id}).select('file').lean()
            if(object.file)
                await deleteFile(object.file)
            await Faq.findByIdAndDelete(_id)
        }
        return 'OK'
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;