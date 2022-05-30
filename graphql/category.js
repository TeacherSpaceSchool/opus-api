const Category = require('../models/category');
const Subcategory = require('../models/subcategory');
const { saveImage, deleteFile, urlMain } = require('../module/const');

const type = `
  type Category {
    _id: ID
    createdAt: Date
    name: String
    image: String
    status: String
    del: Boolean
    searchWords: String
    priority: Int
  }
`;

const query = `
    category(_id: ID!): Category
    categories(search: String, skip: Int, compressed: Boolean): [Category]
    categoriesCount(search: String): Int
    searchWordsCategories: [String]
`;

const mutation = `
    addCategory(image: Upload!, name: String!, priority: Int, searchWords: String!): Category
    setCategory(_id: ID!, status: String, image: Upload, priority: Int, name: String, searchWords: String): String
    deleteCategory(_id: ID!): String
`;

const resolvers = {
    searchWordsCategories: async(parent, arg, {user}) => {
        let searchWords = await Category.find({
            ...'client'===user.role?{status: 'active'}:{},
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
    categoriesCount: async(parent, {search}, {user}) => {
        if('admin'===user.role) {
            return await Category.countDocuments({
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
    categories: async(parent, {search, skip, compressed}, {user}) => {
        return await Category.find({
            ...'client'===user.role?{status: 'active'}:{},
            ...search?{
                $or: [
                    {name: {'$regex': search, '$options': 'i'}},
                    {searchWords: {'$regex': search, '$options': 'i'}}
                ]
            }:{},
            del: {$ne: true}
        })
            .sort('-priority')
            .skip(skip!=undefined ? skip : 0)
            .limit(skip!=undefined ? 30 : 1000000)
            .select(compressed?'_id name image':'')
            .lean()
    },
    category: async(parent, {_id}) => {
        return await Category.findOne({_id}).lean()
    },
};

const resolversMutation = {
    addCategory: async(parent, {image, priority, name, searchWords}, {user}) => {
        if(user.role==='admin'){
            let { stream, filename } = await image;
            filename = await saveImage(stream, filename)
            let object = new Category({
                status: 'active',
                name,
                image: urlMain+filename,
                searchWords,
                priority
            });
            object = await Category.create(object)
            return object
        }
    },
    setCategory: async(parent, {_id, priority, status, image, name, searchWords}, {user}) => {
        if(user.role==='admin'){
            let object = await Category.findOne({
                _id
            })
            if(priority) object.priority = priority
            if(status) object.status = status
            if(name) object.name = name
            if(searchWords) object.searchWords = searchWords
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
    deleteCategory: async(parent, { _id }, {user}) => {
        if(user.role==='admin'&&!(await Subcategory.findOne({category: _id, del: {$ne: true}}).select('_id').lean())){
            let object = await Category.findOne({_id})
            await deleteFile(object.image)
            object.del = true
            await object.save()
            return 'OK'
        }
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;