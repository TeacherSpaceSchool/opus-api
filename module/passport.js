const passport = require('passport');
const LocalStrategy = require('passport-local');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const jwtsecret = 'HZRD8YZtT14pbGZGlZSH';
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const Bonus = require('../models/bonus');
const randomstring = require('randomstring');
const { addBonus } = require('./bonus');

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
                    return done(null, false, {message: 'Нет такого пользователя или пароль неверен.'});
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
                if(req.cookies&&!req.cookies['city']) {
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

const signupuserGQL = async ({name, password, login, code}, res, req) => {
    try{
        //await User.deleteMany()
        let user = new User({
            login: login.trim(),
            role: 'client',
            status: 'active',
            password: password,
            name,
            city: req.cookies['city']?req.cookies['city']:'Бишкек',
            email: '',
            info: '',
            reiting: [],
            specializations: [],
            achievements: [],
            completedWorks: 0,
            prices: [],
            certificates: [],
            favorites: []
        });
        user = await User.create(user);

        if(code){
            code = await Bonus.findOne({code}).select('user').lean()
            if(code)
                await addBonus({count: 10, what: 'Реферальная программа', user: code.user, invited: user._id})
        }

        code = randomstring.generate({length: 4, charset: 'alphanumeric'})
        while (await Bonus.findOne({code}).select('_id').lean())
            code = randomstring.generate({length: 4, charset: 'alphanumeric'})
        let bonus = new Bonus({
            code,
            count: 0,
            user: user._id
        });
        await Bonus.create(bonus);

        const payload = {
            id: user._id,
            login: user.login,
            role: user.role
        };
        const token = jwt.sign(payload, jwtsecret); //здесь создается JWT*/
        await res.cookie('jwt', token, {maxAge: 10000*24*60*60*1000 })
        return(user)
    } catch (err) {
        console.error(err)
        return {role: 'Проверьте данные'}
    }
}

const signinuserGQL = (req, res) => {
    return new Promise((resolve) => {
        passport.authenticate('local', async function (err, user) {
            try{
                if (user) {
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
module.exports.signupuserGQL = signupuserGQL;
module.exports.signinuserGQL = signinuserGQL;