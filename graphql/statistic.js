const Order = require('../models/order');
const User = require('../models/user');
const Subcategory = require('../models/subcategory');
const {checkDate} = require('../module/const');

const type = `
    type Statistic {
        columns: [String]
        row: [StatisticData]
    }
    type StatisticData {
        _id: ID
        data: [String]
    }
`;

const query = `
    statistic(dateStart: Date, dateEnd: Date, type: String, city: String): Statistic
`;

const resolvers = {
    statistic: async(parent, {dateStart, dateEnd, type, city}, {user}) => {
        if('admin'===user.role) {
            if(dateStart){
                dateStart= checkDate(dateStart)
                dateStart.setHours(3, 0, 0, 0)
                if(dateEnd){
                    dateEnd = new Date(dateEnd)
                    dateEnd.setHours(3, 0, 0, 0)
                }
                else {
                    dateEnd = new Date(dateStart)
                    dateEnd.setDate(dateEnd.getDate() + 1)
                }
            }
            else if(type!=='specialist') {
                dateStart= new Date()
                dateStart.setHours(3, 0, 0, 0)
                if(dateEnd){
                    dateEnd = new Date(dateEnd)
                    dateEnd.setHours(3, 0, 0, 0)
                }
                else {
                    dateEnd = new Date(dateStart)
                    dateEnd.setDate(dateEnd.getDate() + 1)
                }
            }
            if(type==='specialist'){
                let _findSubcategories = {}
                let _findSpecialists = await User.find({
                    ...city?{city}:{},
                    $and: [
                        {specializations: {$not: {$size: 0}}},
                        {specializations: {$exists: true}},
                        {specializations: {$elemMatch: {end: {$gt: new Date()}}}},
                        ...dateStart?[
                            {createdAt: {$gte: dateStart}},
                            {createdAt: {$lt: dateEnd}}
                        ]:[]
                    ],
                })
                    .select('specializations')
                    .lean()
                let findSubcategories = await Subcategory.find({
                    del: {$ne: true}
                })
                    .select('name _id')
                    .lean()
                for (let i = 0; i < findSubcategories.length; i++) {
                    _findSubcategories[findSubcategories[i]._id] = {
                        name: findSubcategories[i].name,
                        count: 0
                    }
                }
                let subcategory = ''
                for (let i = 0; i < _findSpecialists.length; i++) {
                    for (let i1 = 0; i1 < _findSpecialists[i].specializations.length; i1++) {
                        if(_findSpecialists[i].specializations[i1].subcategory) {
                            subcategory = _findSpecialists[i].specializations[i1].subcategory
                            if (_findSubcategories[subcategory])
                                _findSubcategories[subcategory].count += 1
                        }
                    }
                }
                const keys = Object.keys(_findSubcategories)
                findSubcategories = []
                for (let i = 0; i < keys.length; i++) {
                    if(_findSubcategories[keys[i]].count>0) {
                        findSubcategories.push({
                            _id: keys[i],
                            data: [
                                _findSubcategories[keys[i]].name,
                                _findSubcategories[keys[i]].count
                            ]
                        })
                    }
                }
                findSubcategories = findSubcategories.sort(function (a, b) {
                    return b.data[1] - a.data[1]
                });
                findSubcategories = [
                    {
                        _id: 'All',
                        data: [
                            `Подкатегорий: ${findSubcategories.length}`,
                            `Исполнителей: ${_findSpecialists.length}`
                        ]
                    },
                    ...findSubcategories
                ]
                return {
                    columns: [
                        'подкатегория',
                        'исполнителей(шт)'
                    ],
                    row: findSubcategories
                };

            }
            else {
                let _findOrder = await Order.find({
                    $and: [{createdAt: {$gte: dateStart}}, {createdAt: {$lt: dateEnd}}],
                })
                    .select('category subcategory status price')
                    .populate({
                        path: type,
                        select: 'name _id'
                    })
                    .lean()
                let findOrder = {}, tag
                for (let i = 0; i < _findOrder.length; i++) {
                    tag = type === 'category' ? _findOrder[i].category : _findOrder[i].subcategory
                    if (!findOrder[tag._id])
                        findOrder[tag._id] = {
                            name: tag.name,
                            'активныйCount': 0,
                            'принятCount': 0,
                            'выполненCount': 0,
                            'отменаCount': 0,
                        }
                    findOrder[tag._id][`${_findOrder[i].status}Count`] += 1
                }
                const keys = Object.keys(findOrder)
                _findOrder = []
                for (let i = 0; i < keys.length; i++) {
                    _findOrder.push({
                        _id: keys[i],
                        data: [
                            findOrder[keys[i]].name,
                            findOrder[keys[i]]['активныйCount'],
                            findOrder[keys[i]]['принятCount'],
                            findOrder[keys[i]]['выполненCount'],
                            findOrder[keys[i]]['отменаCount']
                        ]
                    })
                }
                _findOrder = _findOrder.sort(function (a, b) {
                    return b.data[1] - a.data[1]
                });
                _findOrder = [
                    {
                        _id: 'All',
                        data: [
                            `Заказов: ${_findOrder.length}`,
                        ]
                    },
                    ..._findOrder
                ]
                return {
                    columns: [
                        type === 'category' ? 'категория' : 'подкатегория',
                        'активный(шт)',
                        'принят(шт)',
                        'выполнен(шт)',
                        'отмена(шт)'
                    ],
                    row: _findOrder
                };
            }
        }
    }
};

module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;