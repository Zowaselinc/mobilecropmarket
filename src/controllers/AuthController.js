
const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
const { User, Company, AccessToken, Merchant, Partner, Corporate, Agent, UserCode, MerchantType, Wallet } = require("~database/models");
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const Mailer = require('~services/mailer');
const SendgridMailer = require('~services/sendgrid');
const IPAddr = require('~services/ipaddress');
const md5 = require('md5');
require('dotenv').config(); 

class AuthController {

    /* -------------------------------------------------------------------------- */
    /*                                    login                                   */
    /* -------------------------------------------------------------------------- */


    static async login(req, res) {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }


        const data = req.body;

        let user = await User.findOne({ where: { email: data.email } });

        if (!user) {
            return res.status(200).json({
                error: true,
                message: "Invalid credentials"
            });
        } 

        var userTypeMap = {
            merchant: Merchant,
            partner: Partner,
            agent: Agent,
            corporate: Corporate
        };

        let userType = await userTypeMap[user.type].findOne({
            where: { user_id: user.id },
            include: [
                {
                    model: User, as: "user", include: [
                        { model: Company, as: "company" }
                    ]
                }
            ]
        });

        let passwordCheck = await bcrypt.compare(data.password, user.password)

        if (passwordCheck) {
            const token = jwt.sign(
                { user_id: user.id, agent: req.headers['user-agent'] },
                process.env.TOKEN_KEY,
                { expiresIn: "5d" }
            );
            await AuthController.saveToken(user, token, req);
            //  userType.user.password;
            // const ipAddresses = req.header('x-forwarded-for');
            // let ipAddress = typeof ipAddresses == 'object' ? ipAddresses[0] : ipAddresses;
            let ipAddress = await IPAddr.getIPAddress();
            // console.log("vredfv", ipAddress)
            // NB: If a function in JavaScript returns a promise and a value, you can extract just the value from the returned result using async/await or .then() syntax.

            // Mailer()
            //     .to(user.email).from(process.env.MAIL_FROM)
            //     .subject('New Login').template('emails.LoginNotification', {
            //         ipaddress: ipAddress,
            //         timestamp: (new Date()).toLocaleString(),
            //         name: user.first_name + " " + user.last_name,
            //     }).send();
            
            let from = process.env.SENDGRID_MAIL_FROM;
            let to = user.email;
            let subject = 'New Login';
            let text = '';
            let dynamicTemplateData = {
                ipaddress: ipAddress,
                timestamp: (new Date()).toLocaleString(),
                name: user.first_name + ' ' + user.last_name
            }
            let template = 'emails.LoginNotification';
            

            let emailresult = await SendgridMailer.sendMail(from,to,subject,text,template, dynamicTemplateData);
            // console.log("emailresult",emailresult);


            
            // const msg = {
            //     to: 'ezukachibueze@gmail.com', // Change to your recipient from: 'webservices@zowasel.com', // Change to your verified sender
            //     subject: 'New Login', text: 'and easy to do anywhere, even with Node.js', html: 'emails.LoginNotification',
            //   }
            //   SendgridMailer().send(msg);
            // .then(() => {console.log('Email sent')})
            // .catch((error) => {console.error(error)})

            return res.status(200).json({
                error: false,
                message: "Login Successful",
                token: token,
                user: userType
            });
        } else {
            return res.status(200).json({
                error: true,
                message: "Invalid credentials"
            });
        }


    }

    /* -------------------------------------------------------------------------- */
    /*                              register marchant                             */
    /* -------------------------------------------------------------------------- */

    static async registerMerchantCorporate(req, res) {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const data = req.body;
        let user = await AuthController.saveUser(data);

        if (user.error) {
            console.log(user)
            return res.status(400).json({
                error: true,
                message: user.message
            });
        }

        if (data.has_company) {
            var response = await AuthController.saveCompany(user, data);
            if (response.error) {

                return res.status(400).json({
                    error: true,
                    message: response.message
                });
            }
        }

        var UserTypeModel = data.user_type == "merchant" ? Merchant : Corporate;

        let change;
        if (data.user_type == "merchant") {

            var merchantType = await MerchantType.findOne({ where: { title: 'grower' } });
            if (merchantType) {
                change = { type_id: merchantType.id };
            }
        } else {
            change = { type: "red-hot" };

        }

        await UserTypeModel.create({ ...change, ...{ user_id: user.id } }).catch((error => {
            return res.status(400).json({
                error: true,
                message: error.sqlMessage
            });
        }));

        const token = jwt.sign(
            { user_id: user.id },
            process.env.TOKEN_KEY,
            { expiresIn: "48h" }
        );

        await AuthController.saveToken(user, token, req);

        // Mailer()
        //     .to(data.email).from(process.env.MAIL_FROM)
        //     .subject('Welcome').template('emails.WelcomeEmail').send();

        let from = process.env.SENDGRID_MAIL_FROM;
        let to = data.email;
        let subject = 'Welcome';
        let text = '';
        let dynamicTemplateData = {}
        let template = 'emails.WelcomeEmail';
        
        await SendgridMailer.sendMail(from,to,subject,text,template, dynamicTemplateData);

        res.status(200).json({
            status: true,
            token: token,
            user: user
        });

    }
    

    static async registerAgent(req, res) {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const data = req.body;

        let user = await AuthController.saveUser(data);

        if (user.error) {
            return res.status(400).json({
                error: true,
                message: user.message
            });
        }

        var save = await AuthController.saveCompany(user, data);
        if (save.error) {
            // await user.delete();
            return res.status(400).json({
                error: true,
                message: save.message
            });
        }

        await Agent.create({
            user_id: user.id,
            agent_type: data.agent_type
        }).catch((error) => {
            return res.status(400).json({
                error: true,
                message: error.sqlMessage
            });
        });

        // Mailer()
        //     .to(data.email).from(process.env.MAIL_FROM)
        //     .subject('Welcome').template('emails.WelcomeEmail').send();
        let from = process.env.SENDGRID_MAIL_FROM;
        let to = data.email;
        let subject = 'Welcome';
        let text = '';
        let dynamicTemplateData = {}
        let template = 'emails.WelcomeEmail';
        
        await SendgridMailer.sendMail(from,to,subject,text,template, dynamicTemplateData);


        const token = jwt.sign(
            { user_id: user.id },
            process.env.TOKEN_KEY,
            { expiresIn: "48h" }
        );

        await AuthController.saveToken(user, token, req);

        res.status(200).json({
            status: true,
            token: token,
            user: user
        });

    }

    /* -------------------------------------------------------------------------- */
    /*                              register partner                              */
    /* -------------------------------------------------------------------------- */

    static async registerPartner(req, res) {

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const data = req.body;

        let user = await AuthController.saveUser(data);

        if (user.error) {
            return res.status(400).json({
                error: true,
                message: user.message
            });
        }

        var save = await AuthController.saveCompany(user, data);
        if (save.error) {
            // await user.delete();
            return res.status(400).json({
                error: true,
                message: save.message
            });
        }

        await Partner.create({
            user_id: user.id,
            partnership_type: data.partnership_type
        }).catch((error => {
            return res.status(400).json({
                error: true,
                message: error.sqlMessage
            });
        }));;

        // Mailer()
        //     .to(data.email).from(process.env.MAIL_FROM)
        //     .subject('Welcome').template('emails.WelcomeEmail').send();
        let from = process.env.SENDGRID_MAIL_FROM;
        let to = data.email;
        let subject = 'Welcome';
        let text = '';
        let dynamicTemplateData = {}
        let template = 'emails.WelcomeEmail';
        
        await SendgridMailer.sendMail(from,to,subject,text,template, dynamicTemplateData);

        const token = jwt.sign(
            { user_id: user.id },
            process.env.TOKEN_KEY,
            { expiresIn: "48h" }
        );

        await AuthController.saveToken(user, token, req);

        return res.status(200).json({
            status: true,
            token: token,
            user: user
        });

    }

    static async saveUser(data) {
        var user;
        let encryptedPassword = await bcrypt.hash(data.password, 10);

        try {
            user = await User.create({
                first_name: data.first_name,
                last_name: data.last_name,
                phone: data.phone,
                email: data.email,
                is_verified: 0,
                status: 1,
                password: encryptedPassword,
                type: data.user_type,
                account_type: data.has_company || data.company_email ? "company" : "individual",
            });

            // Create user wallet
            let wallet = await Wallet.create({
                user_id: user.id,
                balance: 0
            });

        } catch (e) {

            user = {
                error: true,
                message: e.sqlMessage
            }
        }

        return user;
    }

    static async saveCompany(user, data) {
        let company;

        try {
            company = await Company.create({
                user_id: user.id,
                company_name: data.company_name,
                company_address: data.company_address,
                company_phone: data.company_phone,
                company_email: data.company_email,
                state: data.company_state,
                rc_number: data.rc_number
            });
        } catch (e) {
            company = {
                error: true,
                message: e.sqlMessage
            }
        }

        return company;
    }

    static async saveToken(user, token, req) {

        let expiry = new Date();
        expiry.setDate(expiry.getDate() + 2);

        var previousToken = await AccessToken.findOne({
            where: {
                user_id: user.id,
                client_id: req.headers['user-agent']
            }
        });

        if (previousToken) {
            await AccessToken.update({
                token: token,
                expires_at: expiry.toISOString().slice(0, 19).replace('T', ' ')
            }, { where: { user_id: user.id, client_id: req.headers['user-agent'] } });
        } else {
            await AccessToken.create({
                user_id: user.id,
                client_id: req.headers['user-agent'],
                token: token,
                expires_at: expiry.toISOString().slice(0, 19).replace('T', ' ')
            });
        }
    }

    static async sendVerificationCode(req, res) {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const data = req.body;

        function getRandomInt(min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
        }

        var code = getRandomInt(100000, 999999);

        //Check for exixting
        var formerCode = await UserCode.findOne({ where: { email: data.email, type: "verification" } })

        if (!formerCode) {
            UserCode.create({
                email: data.email,
                type: "verification",
                code: code
            }).catch(error => {
                console.log(error.sqlMessage)
            });
        } else {
            UserCode.update({
                code: code,
            }, {
                where: { email: data.email, type: "verification" }
            }).catch(error => {
                console.log(error.sqlMessage)
            });
        }




        Mailer()
            .to(data.email).from(process.env.MAIL_FROM)
            .subject('Verify').template('emails.OTPEmail', { code: code }).send();


        return res.status(200).json({
            status: true,
            message: "Code sent successfully"
        });

    }

    static async verifyCode(req, res) {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }


        const data = req.body;

        var userCode = await UserCode.findOne({ where: { email: data.email, type: "verification" } });

        if (userCode.code == data.code) {
            return res.status(200).json({
                status: true,
                message: "Code verified successfully"
            });
        } else {
            return res.status(200).json({
                error: true,
                message: "Invalid code"
            });
        }



    }

    static async sendResetEmail(req, res) {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        var refererUrl = req.headers.referer;

        const data = req.body;

        function getRandomInt(min, max) {
            min = Math.ceil(min);
            max = Math.floor(max);
            return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
        }

        var code = getRandomInt(10000000, 99999999);

        var user = await User.findOne({ where: { email: data.email } });

        if (!user) {
            return res.status(400).json({
                error: true,
                message: "A user with this email does not exist"
            });
        }

        var resetToken = md5(code);
        var resetTokenNoMd5 = code;

        //Check for exixting
        var formerCode = await UserCode.findOne({ where: { email: data.email, type: "reset" } });

        if (!formerCode) {
            UserCode.create({
                email: data.email,
                type: "reset",
                code: resetTokenNoMd5
            }).catch(error => {
                console.log(error.sqlMessage)
            });
        } else {
            UserCode.update({ code: resetTokenNoMd5 },
                {
                    where: { email: data.email, type: "reset" }
                }).catch(error => {
                    console.log(error.sqlMessage)
                });
        }

        // Mailer()
        //     .to(data.email).from(process.env.MAIL_FROM)
        //     .subject('Reset Password')
        //     // .template('emails.ResetEmail', { resetLink: `${refererUrl}resetpassword/${resetToken}` }).send();
        //     .template('emails.ResetEmail', { resetCode: `${resetTokenNoMd5}` }).send();
        let from = process.env.SENDGRID_MAIL_FROM;
        let to = data.email;
        let subject = 'Reset Password';
        let text = '';
        let dynamicTemplateData = {resetCode: `${resetTokenNoMd5}`}
        let template = 'emails.ResetEmail';
        
        await SendgridMailer.sendMail(from,to,subject,text,template, dynamicTemplateData);


        res.status(200).json({
            status: true,
            message: "Code sent successfully "+resetTokenNoMd5
        });

    }

    static async verifyResetToken(req, res) {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }


        const data = req.body;

        var userCode = await UserCode.findOne({ where: { code: data.token } });

        if (!userCode) {
            res.status(400).json({
                status: false,
                message: "Invalid token"
            });
        }

        res.status(200).json({
            status: true,
            message: "Valid token"
        });

    }

    static async resetPassword(req, res) {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }


        const data = req.body;

        var getCode = await UserCode.findOne({ where: { code: data.token, type: "reset" } });

        if (!getCode) {
            return res.status(400).json({
                error: true,
                message: "Invalid reset code"
            });
        }


        var user = await User.findOne({ where: { email: getCode.email } });

        if (!user) {
            return res.status(200).json({
                error: true,
                message: "A user with this email does not exist"
            });
        }

        let encryptedPassword = await bcrypt.hash(data.password, 10);

        await User.update({
            password: encryptedPassword
        }, { where: { id: user.id } });

        res.status(200).json({
            status: true,
            message: "Password reset successfully"
        });

    }




}

module.exports = AuthController;