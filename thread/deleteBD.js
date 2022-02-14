const { isMainThread } = require('worker_threads');
const connectDB = require('../models/index');
const cron = require('node-cron');
const Notification = require('../models/notification');
const Order = require('../models/order');
connectDB.connect();

if(!isMainThread) {
    cron.schedule('1 3 * * *', async() => {
        let date = new Date()
        date.setDate(date.getDate() - 60)
        await Notification.deleteMany({createdAt: {$lte: date}})
        await Order.deleteMany({createdAt: {$lte: date}, status: 'активный'})
    });
}