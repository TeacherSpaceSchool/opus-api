const Application = require('../models/application');

module.exports.reductionToApplication = async() => {
    console.log('reductionToApplication:', await Application.updateMany({city: null}, {city: 'Бишкек'}))
}