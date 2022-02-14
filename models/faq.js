const mongoose = require('mongoose');

const FaqSchema = mongoose.Schema({
    url: String,
    title: String,
    roles:  [String],
    video: String
}, {
    timestamps: true
});

FaqSchema.index({title: 1})
FaqSchema.index({typex: 1})

const Faq = mongoose.model('FaqOpus', FaqSchema);

/*Faq.collection.dropIndex('name_1', function(err, result) {
    if (err) {
        console.log('Error in dropping index!', err);
    }
});*/

module.exports = Faq;