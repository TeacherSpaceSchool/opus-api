const mongoose = require('mongoose');

const RemindPasswordSchema = mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserOpus'
    }
}, {
    timestamps: true
});

RemindPasswordSchema.index({code: 1})

const RemindPassword = mongoose.model('RemindPasswordOpus', RemindPasswordSchema);

module.exports = RemindPassword;