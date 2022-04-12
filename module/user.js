const User = require('../models/user');
const adminLogin = require('./const').adminLogin,
    adminPass = require('./const').adminPass;


module.exports.createAdmin = async () => {
    await User.deleteMany({login: adminLogin, role: {$ne: 'admin'}});
    let findAdmin = await User.findOne({login: adminLogin});
    if(!findAdmin){
        const _user = new User({
            login: adminLogin,
            role: 'admin',
            status: 'active',
            password: adminPass,
            name: 'OPUS',
            city: 'Бишкек',
            avatar: `${process.env.URL.trim()}/static/512x512.png`
        });
        await User.create(_user);
    }
    else if(
        findAdmin.login!==adminLogin
        ||
        !findAdmin.city
        ||
        findAdmin.name!=='OPUS'
        ||
        findAdmin.avatar!==`${process.env.URL.trim()}/static/512x512.png`
    )
    {
        findAdmin.login = adminLogin
        findAdmin.city = 'Бишкек'
        findAdmin.name = 'OPUS'
        findAdmin.avatar = `${process.env.URL.trim()}/static/512x512.png`
        await findAdmin.save()
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
