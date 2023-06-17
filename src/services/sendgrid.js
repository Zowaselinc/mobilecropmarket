"use strict";

const sgMail = require('@sendgrid/mail')

require('dotenv').config();

const Utilities = require('~utilities/file');

sgMail.setApiKey(process.env.SENDGRID_API_KEY)


class SendgridMailer {

    static async sendMail(from,recipient,subject,text,template,dynamicTemplateData) {
        // template = { ...template, ...dynamicTemplateData };

        let data = dynamicTemplateData;
        const maildetails = {
            to: recipient,
            from: `Zowasel <${from}>`,
            subject: subject,
            text: 'text',
            html: Utilities.loadTemplate(template, data)
        }

        // return maildetails;

        await sgMail.send(maildetails)
            .then(() => {
                console.log('Email sent')
            })
            .catch((error) => {
                console.error(error)
            })
    }

}

module.exports = SendgridMailer;