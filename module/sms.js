const ModelsError = require('../models/error');
const axios = require('axios');
const builder = require('xmlbuilder');
const { loginSms, pwdSms, senderSms, urlSms } = require('../module/const');
const xml2js = require('xml-js').xml2js;
const messages = {
    '0': 'Сообщения успешно приняты к отправке',
    '1': 'Ошибка в формате запроса',
    '2': 'Неверная авторизация',
    '3': 'Недопустимый IP-адрес отправителя',
    '4': 'Недостаточно средств на счету клиента',
    '5': 'Недопустимое имя отправителя',
    '6': 'Сообщение заблокировано по стоп-словам',
    '7': 'Некорректное написание одного или нескольких номеров телефонов получателей',
    '8': 'Неверный формат времени отправки',
    '9': 'Превышение времени обработки запрос',
    '10': 'Отправка заблокирована из-за последовательного повторения id',
    '11': 'Сообщение успешно обработано, но не принято к отправке и не протарифицировано',
}

const sendSmsPassword = async (phone, password) => {
    let resXml = ''
    try{
        let xml = {
            message: {
                login: loginSms,
                pwd: pwdSms,
                sender: senderSms,
                text: `Ваш код: ${password}.\nНикому не давайте код, даже если его требуют от имени OPUS.KG!\nЕсли Вы не запрашивали пароль, проигнорируйте это сообщение.`,
                phones: {
                    phone: `996${phone}`
                },
            }
        }
        xml = (builder.create(xml)).end({ pretty: true})
        let config = {
            headers: {'Content-Type': 'application/xml;charset=UTF-8', 'Accept': 'application/xml;charset=UTF-8'}
        };
        let res = await axios.post(urlSms, xml, config)
        resXml = res.data
        res = await xml2js(res.data, {compact: true})
        if(res.response.status._text!=='0'){
            let _object = new ModelsError({
                err: messages[res.response.status._text],
                path: 'sendSmsPassword'
            });
            await ModelsError.create(_object)
        }
    } catch (err) {
        let _object = new ModelsError({
            err: `${resXml} ${err.message}`,
            path: 'sendSmsPassword'
        });
        await ModelsError.create(_object)
        console.error(err)
        return 'ERROR'
    }
    return 'OK'
}
module.exports.sendSmsPassword = sendSmsPassword;

const sendSmsMailing = async (phones, text) => {
    let resXml = ''
    try{
        let xml = {
            message: {
                login: loginSms,
                pwd: pwdSms,
                sender: senderSms,
                text,
                phones: [],
                ...(process.env.URL).trim()==='https://opus.kg'?{}:{test: 1}
            }
        }
        for(let i = 0; i<phones.length;i++) {
            xml.message.phones.push({phone: `996${phones[i]}`})
        }
        xml = (builder.create(xml, {separateArrayItems: true})).end({ pretty: true})
        let config = {
            headers: {'Content-Type': 'application/xml;charset=UTF-8', 'Accept': 'application/xml;charset=UTF-8'}
        };
        let res = await axios.post(urlSms, xml, config)
        resXml = res.data
        res = await xml2js(res.data, {compact: true})
        if('0'!==res.response.status._text){
            let _object = new ModelsError({
                err: messages[res.response.status._text],
                path: 'sendSmsPassword'
            });
            await ModelsError.create(_object)
        }
    } catch (err) {
        let _object = new ModelsError({
            err: `${resXml} ${err.message}`,
            path: 'sendSmsPassword'
        });
        await ModelsError.create(_object)
        console.error(err)
        return 'ERROR'
    }
    return 'OK'
}
module.exports.sendSmsMailing = sendSmsMailing;