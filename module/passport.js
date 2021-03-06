const passport = require('passport');
const LocalStrategy = require('passport-local');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwtsecret = 'HZRD8YZtT14pbGZGlZSH';
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const Bonus = require('../models/bonus');
const { addBonus } = require('./bonus');
const { sendMessageByAdmin } = require('./chat');

let start = () => {
//настройка паспорта
    passport.use(new LocalStrategy({
            usernameField: 'login',
            passwordField: 'password',
            session: false
        },
        function (login, password, done) {
            User.findOne({login: login}, (err, user) => {
                if (err) {
                    return done(err);
                }
                if (!user || !user.checkPassword(password) || user.status!=='active') {
                    return done(null, false, {message: 'Нет такого пользователя или код неверен.'});
                }
                return done(null, user);
            })
        })
    );
    const jwtOptions = {};
    jwtOptions.jwtFromRequest= ExtractJwt.fromAuthHeaderAsBearerToken();
    jwtOptions.secretOrKey=jwtsecret;
    passport.use(new JwtStrategy(jwtOptions, async function (payload, done) {
        let user = await User.findOne({login: payload.login}).lean()
        if (user&&user.status==='active') {
            return done(null, user)
        } else {
            return done(null, false)
        }
    }));
}

const verifydeuserGQL = async (req, res) => {
    return new Promise((resolve) => { passport.authenticate('jwt', async function (err, user) {
        try{
            if(user) {
                if(req.cookies&&(!req.cookies['city']||user.role!=='admin'&&req.cookies['city']!==user.city)) {
                    req.cookies['city'] = user.city
                    await res.cookie('city', user.city, {maxAge: 10000*24*60*60*1000 })
                }
                resolve(user)
            } else
                resolve({})
        } catch (err) {
            console.error(err)
            resolve({})
        }
    } )(req, res)
    })
}

const changePhoneGQL = (req, res, {newPhone}) => {
    return new Promise((resolve) => {
        passport.authenticate('local', async function (err, user) {
            try{
                if (user) {
                    user.login = newPhone
                    await user.save()
                    const payload = {
                        id: user._id,
                        login: user.login,
                        role: user.role
                    };
                    const token = await jwt.sign(payload, jwtsecret); //здесь создается JWT
                    await res.cookie('jwt', token, {maxAge: 10000*24*60*60*1000 });
                    resolve('OK')
                }
                else
                    resolve('ERROR')
            } catch (err) {
                console.error(err)
                resolve('ERROR')
            }
        })(req, res);
    })
}

const signinuserGQL = (req, res, {name, code, isApple}) => {
    return new Promise((resolve) => {
        passport.authenticate('local', async function (err, user) {
            try{
                if (user) {
                    if(!user.name.length) {
                        await sendMessageByAdmin({
                            text: 'OPUS сервисине кош келипсиз!\n' +
                            'Бул жактан сиз турмуш- тиричиликке байланышкан баардык маселелерге натыйжалуу чечим таба аласыз.\n' +
                            '1 мүнөттө биздин сервис тууралуу кабардар болуңуз!',
                            user: user._id,
                            type: 'text',
                            tag: 'passport_kg'
                        })
                        await sendMessageByAdmin({text: 'https://youtu.be/Ca6k9AgQ7xU', user: user._id, type: 'link'})
                        await sendMessageByAdmin({
                            text: 'P.S: Промокод боюнча досторуңузду чакырып, бонустарга ээ болуңуз!  Кененирээк "Бонусы" бөлүмүндө.',
                            user: user._id,
                            type: 'text'
                        })
                        await sendMessageByAdmin({text: '*****', user: user._id, type: 'text'})
                        await sendMessageByAdmin({
                            text: 'Добро пожаловать на сервис OPUS!\n' +
                            'Здесь вы найдете решение для всех бытовых задач.\n' +
                            'Узнайте всё о нашем сервисе всего за 1 минуту!',
                            user: user._id,
                            type: 'text',
                            tag: 'passport_ru'
                        })
                        await sendMessageByAdmin({text: 'https://youtu.be/Pg6LH3PnFU0', user: user._id, type: 'link'})
                        await sendMessageByAdmin({
                            text: 'P.S: Приглашайте друзей по промокоду и получайте бонусы! Подробнее в разделе "Бонусы"',
                            user: user._id,
                            type: 'text'
                        })
                        await sendMessageByAdmin({text: '*****', user: user._id, type: 'text'})
                        if (isApple) {
                            await sendMessageByAdmin({
                                text: 'iOS (iPhone) ээлери үчүн маалымат.\n' +
                                'Сиздин ыңгайлуулугуңуз үчүн, башкы экраныңызга OPUS веб-версиясынын белгисин жайгаштырып алсаңыз болот.\n' +
                                'Ал үчүн: opus.kg сайтына кирип, "Поделиться", "Экран Домой"  жана "Добавить" баскычтарын басуу керек.',
                                user: user._id,
                                type: 'text'
                            })
                            await sendMessageByAdmin({text: '*****', user: user._id, type: 'text'})
                            await sendMessageByAdmin({
                                text: 'Сообщение для владельцев iOS (iPhone).\n' +
                                'Для вашего удобства, вы можете установить ярлык веб-версии OPUS на ваш главный экран.\n' +
                                'Для этого вам необходимо:\n' +
                                '1) Зайти на сайт opus.kg;\n' +
                                '2) Нажать на кнопку "Поделиться"\n' +
                                '3) Нажать на "Экран домой";\n' +
                                '4) Нажать "Добавить".', user: user._id, type: 'text'
                            })
                            await sendMessageByAdmin({text: '*****', user: user._id, type: 'text'})
                        }
                        user.name = !(name.toLowerCase()).includes('opus')?name:'Новый пользователь'
                        await user.save()
                    }

                    if (code) {
                        code = await Bonus.findOne({code}).select('user').lean()
                        if (code)
                            await addBonus({count: 15, what: 'Реферальная программа', user: code.user, invited: user._id})
                    }

                    const payload = {
                        id: user._id,
                        login: user.login,
                        role: user.role
                    };
                    const token = await jwt.sign(payload, jwtsecret); //здесь создается JWT
                    await res.cookie('city', user.city, {maxAge: 10000*24*60*60*1000 })
                    await res.cookie('jwt', token, {maxAge: 10000*24*60*60*1000 });
                    resolve(user)
                }
                else
                    resolve({role: 'Проверьте данные'})
            } catch (err) {
                console.error(err)
                resolve({role: 'Проверьте данные'})
            }
        })(req, res);
    })
}

const getuser = async (req, res, func) => {
    await passport.authenticate('jwt', async function (err, user) {
        try{
            await func(user)
        } catch (err) {
            console.error(err)
            res.status(401);
            res.end('err')
        }
    } )(req, res)
}

module.exports.getuser = getuser;
module.exports.verifydeuserGQL = verifydeuserGQL;
module.exports.start = start;
module.exports.signinuserGQL = signinuserGQL;
module.exports.changePhoneGQL = changePhoneGQL;