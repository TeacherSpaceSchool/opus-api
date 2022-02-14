const User = require('../models/user');
const adminLogin = require('./const').adminLogin,
    adminPass = require('./const').adminPass;


module.exports.createAdmin = async () => {
    await User.deleteMany({$or:[{login: adminLogin, role: {$ne: 'admin'}}, {role: 'admin', login: {$ne: adminLogin}}, {role: 'admin', city: undefined}]});
    let findAdmin = await User.findOne({login: adminLogin}).lean();
    if(!findAdmin){
        const _user = new User({
            login: adminLogin,
            role: 'admin',
            status: 'active',
            password: adminPass,
            name: 'admin',
            city: 'Бишкек'
        });
        await User.create(_user);
    }
}

module.exports.reductionToUser = async() => {
    let users = await User.find({login: '554237572'})
    console.log(`reductionToUser: ${users.length}`)
    for(let i = 0; i<users.length;i++){
        users[i].specializations = []
        await users[i].save();
    }
}
