const MainSubcategory = require('../models/mainSubcategory');

const type = `
  type MainSubcategory {
    sc1: Subcategory
    sc2: Subcategory
    sc3: Subcategory
    sc4: Subcategory
    sc5: Subcategory
    sc6: Subcategory
  }
`;

const query = `
    mainSubcategory: MainSubcategory
`;

const mutation = `
    setMainSubcategory(sc1: ID, sc2: ID, sc3: ID, sc4: ID, sc5: ID, sc6: ID): String
`;

const resolvers = {
    mainSubcategory: async() => {
        let res =  await MainSubcategory.findOne()
            .populate('sc1')
            .populate('sc2')
            .populate('sc3')
            .populate('sc4')
            .populate('sc5')
            .populate('sc6')
            .lean()
        if(!res)
            res = {
                sc1: undefined,
                sc2: undefined,
                sc3: undefined,
                sc4: undefined,
                sc5: undefined,
                sc6: undefined,
            }
        return res
    },
};

const resolversMutation = {
    setMainSubcategory: async(parent, {sc1, sc2, sc3, sc4, sc5, sc6}, {user}) => {
        if(user.role==='admin'){
            let res =  await MainSubcategory.findOne()
            if(res){
                res.sc1 = sc1
                res.sc2 = sc2
                res.sc3 = sc3
                res.sc4 = sc4
                res.sc5 = sc5
                res.sc6 = sc6
                await res.save()
            }
            else {
                let object = new MainSubcategory({sc1, sc2, sc3, sc4, sc5, sc6});
                await MainSubcategory.create(object)
            }
            return 'OK'
        }
    }
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;