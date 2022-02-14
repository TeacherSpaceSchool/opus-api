const Redis = require('ioredis');

module.exports.SingletonRedis = class SingletonRedis {
    constructor() {
        if (!!SingletonRedis.instance) {
            return SingletonRedis.instance;
        }
        SingletonRedis.instance = this;
        this.redis = new Redis();
        return this;
    }
    async setOnline(user, geo){
        let data = {}
        data.online = new Date()
        if(geo)
            data.geo = JSON.stringify(geo)
        await this.redis.set(user, JSON.stringify(data))
    }
    async getOnline(user){
        user = await this.redis.get(user)
        return user?(JSON.parse(user)).online:null
    }
    async getGeo(user){
        user = await this.redis.get(user)
        if(user)
            user = (JSON.parse(user)).geo
        return user?JSON.parse(user):null
    }
}