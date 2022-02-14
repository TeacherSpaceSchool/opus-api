const mongoose = require('mongoose');

const ContactSchema = mongoose.Schema({
    name: String,
    image: String,
    addresses: mongoose.Schema.Types.Mixed,
    email: [String],
    phone: [String],
    info: String,
    social: mongoose.Schema.Types.Mixed,
}, {
    timestamps: true
});


const Contact = mongoose.model('ContactOpus', ContactSchema);

module.exports = Contact;