const Contact = require('../models/contact');
const { saveImage, deleteFile, urlMain } = require('../module/const');

const type = `
  type Contact {
    _id: ID
    name: String
    image: String
    addresses: [Address]
    email: [String]
    phone: [String]
    info: String
    social: [String]
 }
`;

const query = `
    contact: Contact
`;

const mutation = `
    setContact(name: String!, image: Upload, addresses: [AddressInput]!, email: [String]!, phone: [String]!, info: String!, social: [String]!): String
`;

const resolvers = {
    contact: async() => {
        let contact = await Contact.findOne().lean()
        return !contact ? {
            name: '',
            image: '',
            addresses: [],
            email: [],
            phone: [],
            info: '',
            social: ['', '', '', '']
        } : contact
    }
};

const resolversMutation = {
    setContact: async(parent, {name, image, addresses, email, phone, info, social}, {user}) => {
        if('admin'===user.role) {
            let object = await Contact.findOne()
            if(!object){
                object = new Contact({
                    name,
                    info,
                    phone,
                    email,
                    addresses,
                    social
                });
                if(image) {
                    let {stream, filename} = await image;
                    object.image = urlMain+(await saveImage(stream, filename))
                }
                else
                    object.image = ''
                object = await Contact.create(object)
            }
            else {
                if (image) {
                    let {stream, filename} = await image;
                    if(object.image)
                        await deleteFile(object.image)
                    filename = await saveImage(stream, filename)
                    object.image = urlMain + filename
                }
                object.name = name
                object.info = info
                object.phone = phone
                object.email = email
                object.addresses = addresses
                object.social = social
                await object.save();
            }
            return 'OK'
        }
        return 'ERROR'
    },
};

module.exports.resolversMutation = resolversMutation;
module.exports.mutation = mutation;
module.exports.type = type;
module.exports.query = query;
module.exports.resolvers = resolvers;