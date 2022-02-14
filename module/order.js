const Order = require('../models/order');

module.exports.reductionToOrder = async() => {
    console.log('reductionToOrder:', await Order.updateMany({status: 'обработка'}, {status: 'активный'}))
}