const mongoose = require('mongoose');
const crypto = require('crypto');
const uniqueValidator = require('mongoose-unique-validator');

const userSchema = mongoose.Schema({
    login: {
        type: String,
        required: true,
        unique: true
    },
    role: String,
    status: String,
    passwordHash: String,
    salt: String,
    device: String,
    notification: Boolean,
    lastActive: Date,

    unreadBN: mongoose.Schema.Types.Mixed,
    name: String,
    city: String,
    email: String,
    info: String,
    avatar: String,
    addresses: mongoose.Schema.Types.Mixed,
    reiting: [Number],
    specializations: mongoose.Schema.Types.Mixed,
    achievements: [String],
    completedWorks: Number,
    avgReiting: Number,
    prices: mongoose.Schema.Types.Mixed,
    certificates: [String],
    favorites: [String]
}, {
    timestamps: true
});

userSchema.virtual('password')
    .set(function (password) {
        this._plainPassword = password;
        if (password) {
            this.salt = crypto.randomBytes(128).toString('base64');
            this.passwordHash = crypto.pbkdf2Sync(password, this.salt, 1, 128, 'sha1');
        } else {
            this.salt = undefined;
            this.passwordHash = undefined;
        }
    })
    .get(function () {
        return this._plainPassword;
    });

userSchema.methods.checkPassword = function (password) {
    if (!password) return false;
    if (!this.passwordHash) return false;
    return crypto.pbkdf2Sync(password, this.salt, 1, 128, 'sha1') == this.passwordHash;
};

userSchema.plugin(uniqueValidator);

userSchema.index({role: 1})
userSchema.index({login: 1})

const User = mongoose.model('UserOpus', userSchema);

/*User.collection.dropIndex('email_1', function(err, result) {
    if (err) {
        console.log('Error in dropping index!', err);
    }
});*/

module.exports = User;