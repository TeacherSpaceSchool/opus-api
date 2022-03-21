const Subcategory = require('../models/subcategory');
const { saveImage, deleteFile, urlMain } = require('../module/const');
const User = require('../models/user');

const type = `
  type Subcategory {
    _id: ID
    createdAt: Date
    name: String
    del: Boolean
    image: String
    status: String
    category: Category
    searchWords: String
    quickTitles: String
    autoApplication: Boolean
    priority: Int
  }
`;

const query = `
    subcategory(_id: ID!): Subcategory
    subcategories(search: String, sort: String, skip: Int, category: ID): [Subcategory]
    subcategoriesBySpecialist(specialist: ID!): [Subcategory]
    subcategoriesCount(search: String, category: ID!): Int
    searchWordsSubcategories(category: ID): [String]
`;

const mutation = `
    addSubcategory(image: Upload!, quickTitles: String!, autoApplication: Boolean!, name: String!, priority: Int, category: ID!, searchWords: String!): Subcategory
    setSubcategory(_id: ID!, status: String, quickTitles: String, image: Upload, autoApplication: Boolean, priority: Int, name: String, category: ID, searchWords: String): String
    deleteSubcategory(_id: ID!): String
`;

const resolvers = {
    searchWordsSubcategories: async(parent, {category}, {user}) => {
        let searchWords = await Subcategory.find({
            ...'client'===user.role?{status: 'active'}:{},
            ...category?{category}:{},
            del: {$ne: true}
        })
            .distinct('searchWords')
            .lean()
        let _searchWords = [], idx = 0
        for (let i = 0; i < searchWords.length; i++) {
            _searchWords = [...searchWords[i].split(', '), ..._searchWords]
        }
        searchWords = []
        while(_searchWords.length){
            idx = Math.floor(Math.random() * _searchWords.length)
            searchWords = [...searchWords, _searchWords[idx]]
            _searchWords.splice(idx, 1)
        }
        return searchWords
    },
    subcategory: async(parent, {_id}) => {
        return await Subcategory.findOne({_id})
            .populate({
                path: 'category',
                select: '_id name'
            })
            .lean()
    },
    subcategories: async(parent, {search, skip, category, sort}, {user}) => {
        return await Subcategory.find({
            ...search?{
                $or: [
                    {name: {'$regex': search, '$options': 'i'}},
                    {searchWords: {'$regex': search, '$options': 'i'}}
                ]
            }:{},
            ...category?{category}:{},
            ...'client'===user.role?{status: 'active'}:{},
            del: {$ne: true}
        })
            .sort(sort?sort:'-priority')
            .skip(skip!=undefined ? skip : 0)
            .limit(skip!=undefined ? 15 : 1000000)
            .populate({
                path: 'category',
                select: '_id name'
            })
            .lean()
    },
    subcategoriesBySpecialist: async(parent, {specialist}) => {
        let res = []
        specialist = await User.findOne({
            _id: specialist
        })
            .select('specializations')
            .lean()
        if(specialist) {
            for(let i = 0; i<specialist.specializations.length;i++) {
                if(specialist.specializations[i].end>new Date()&&specialist.specializations[i].enable)
                    res.push(specialist.specializations[i].subcategory)
            }
            res =  await Subcategory.find({
                _id: {$in: res},
                status: 'active',
                del: {$ne: true}
            })
                .sort('-priority')
                .populate({
                    path: 'category',
                    select: '_id name'
                })
                .lean()
        }
        return res
    },
    subcategoriesCount: async(parent, {search, category}, {user}) => {
        if('admin'===user.role) {
            return await Subcategory.countDocuments({
                category,
                ...search?{
                    $or: [
                        {name: {'$regex': search, '$options': 'i'}},
                        {searchWords: {'$regex': search, '$options': 'i'}}
                    ]
                }:{},
                del: {$ne: true}
            })
                .lean()
        }
    },
};

const resolversMutation = {
    addSubcategory: async(parent, {quickTitles, image, priority, name, category, searchWords, autoApplication}, {user}) => {
        if(user.role==='admin'){
            let { stream, filename } = await image;
            filename = await saveImage(stream, filename)
            let object = new Subcategory({
                status: 'active',
                name,
                image: urlMain+filename,
                category,
                searchWords,
                autoApplication,
                priority,
                quickTitles
            });
            object = await Subcategory.create(object)
            return object
        }
    },
    setSubcategory: async(parent, {quickTitles, _id, priority, status, image, name, category, searchWords, autoApplication}, {user}) => {
        if(user.role==='admin'){
            let object = await Subcategory.findOne({
                _id
            })
            if(priority) object.priority = priority
            if(category) object.category = category
            if(status) object.status = status
            if(name) object.name = name
            if(searchWords) object.searchWords = searchWords
            if(quickTitles) object.quickTitles = quickTitles
            if(autoApplication!=undefined) object.autoApplication = autoApplication
            if(image) {
                let {stream, filename} = await image;
                await deleteFile(object.image)
                filename = await saveImage(stream, filename)
                object.image = urlMain + filename
            }
            await object.save();
            return 'OK'
        }
    },
    deleteSubcategory: async(parent, { _id }, {user}) => {
        if(user.role==='admin'&&!(await User.findOne({specializations: {$elemMatch: {subcategory: _id}}}).select('_id').lean())){
            let object = await Subcategory.findOne({_id})
            await deleteFile(object.image)
            object.del = true
            await object.save()
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