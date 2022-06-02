const { Worker, isMainThread } = require('worker_threads');
const { createAdmin, reductionToUser } = require('../module/user');
const { reductionToOrder } = require('../module/order');
const { reductionToApplication } = require('../module/application');
const { reductionToChat } = require('../module/chat');
const { reductionToNotification } = require('../module/notification');

let startDeleteBD = async () => {
    if(isMainThread) {
        let w = new Worker('./thread/deleteBD.js', {workerData: 0});
        w.on('message', (msg) => {
            console.log('DeleteBD: '+msg);
        })
        w.on('error', console.error);
        w.on('exit', (code) => {
            if(code !== 0)
                console.error(new Error(`DeleteBD stopped with exit code ${code}`))
        });
        console.log('DeleteBD '+w.threadId+ ' run')
    }
}

let start = async () => {
    await createAdmin();
    /*await reductionToUser()
    await reductionToNotification()
    await reductionToOrder()*/
    await reductionToApplication()
    await startDeleteBD();
    //await reductionToChat()
}

module.exports.start = start;
