const express = require('express');
const router = express.Router();
const randomstring = require('randomstring');
const Subscriber = require('../models/subscriber');
const User = require('../models/user');
const passportEngine = require('../module/passport');
const ModelsError = require('../models/error');

router.post('/register', async (req, res) => {
    await passportEngine.getuser(req, res, async (user)=> {
        try {
            let subscriptionModel;
            let number = req.body.number
            subscriptionModel = await Subscriber.findOne({$or: [{number: number}, {endpoint: req.body.endpoint}]})
            if (subscriptionModel) {
                subscriptionModel.endpoint = req.body.endpoint
                subscriptionModel.keys = req.body.keys
            }
            else {
                number = randomstring.generate({length: 20, charset: 'numeric'});
                while (await Subscriber.findOne({number: number}).select('_id').lean())
                    number = randomstring.generate({length: 20, charset: 'numeric'});
                subscriptionModel = new Subscriber({
                    endpoint: req.body.endpoint,
                    keys: req.body.keys,
                    number: number,
                });
            }
            if(user) {
                subscriptionModel.user = user._id
                let _user = await User.findById(user._id)
                _user.notification = true
                await _user.save()
            }
            subscriptionModel.save((err) => {
                if (err) {
                    console.error(`Error occurred while saving subscription. Err: ${err}`);
                    res.status(500).json({
                        error: 'Technical error occurred'
                    });
                } else {
                    console.log('Subscription saved');
                    res.send(subscriptionModel.number)
                }
            });
        } catch (err) {
            let _object = new ModelsError({
                err: err.message,
                path: 'subscribe register'
            });
            await ModelsError.create(_object)
            console.error(err)
            res.status(501);
            res.end('error')
        }
    })
});

router.post('/unregister', async (req, res) => {
    try{
        let subscriptionModel = await Subscriber.findOne({number: req.body.number})
        if(subscriptionModel&&subscriptionModel.user) {
            let _user = await User.findOne({_id: subscriptionModel.user._id})
            if(_user) {
                _user.notification = false
                await _user.save()
            }
            subscriptionModel.user = null
            await subscriptionModel.save()
        }
    } catch (err) {
        let _object = new ModelsError({
            err: err.message,
            path: 'subscribe unregister'
        });
        await ModelsError.create(_object)
        console.error(err)
        res.status(501);
        res.end('error')
    }
});

router.post('/delete', async (req, res) => {
    try{
        let subscriptionModel = await Subscriber.findOne({number: req.body.number}).select('user').lean()
        if(subscriptionModel&&subscriptionModel.user) {
            let _user = await User.findById(subscriptionModel.user)
            if(_user) {
                _user.notification = false
                await _user.save()
            }
        }
        await Subscriber.deleteMany({number: req.body.number})
    } catch (err) {
        let _object = new ModelsError({
            err: err.message,
            path: 'subscribe delete'
        });
        await ModelsError.create(_object)
        console.error(err)
        res.status(501);
        res.end('error')
    }
});

router.get('/check', async(req, res) => {
    try{
        await Subscriber.findOne()
        res.status(200);
        res.end('ok')
    } catch (err) {
        console.error(err)
        res.status(501);
        res.end('error')
    }
});

module.exports = router;