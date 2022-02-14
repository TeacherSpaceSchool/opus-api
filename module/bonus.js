const Bonus = require('../models/bonus');
const BonusHistory = require('../models/bonusHistory');

module.exports.addBonus = async({count, what, user, invited}) => {
    let bonusHistory = new BonusHistory({
        count,
        what,
        user,
        invited
    });
    await BonusHistory.create(bonusHistory)
    let bonus = await Bonus.findOne({user})
    bonus.count += count
    await bonus.save()
}