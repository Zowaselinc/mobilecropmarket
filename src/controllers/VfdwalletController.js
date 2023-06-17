const { validationResult } = require("express-validator");
const { Op } = require("sequelize");
const { ErrorLog, VfdWallet } = require("~database/models");
const axios = require('axios');


class VfdwalletController {
    /* ------------------------------  ----------------------------- */
    static async createVfdaccount(req, res) {
        try {
            let user = req.global.user;
            let Vfdwallet = await VfdWallet.findOne({
                where: { user_id: user.id }
            });

            if (Vfdwallet) {
                return res.status(400).json({
                    error: true,
                    message: "Vfd wallet already created",
                    // data: { balance: wallet.balance }
                    data: []
                });
            } else {
                const requestData = {
                    firstname:req.body.firstname,
                    lastname:req.body.lastname,
                    middlename:req.body.middlename,
                    dob:req.body.dob,
                    address:req.body.address,
                    gender:req.body.gender,
                    phone:req.body.phone,
                    bvn:req.body.bvn
                };
                const config = {
                    headers: {
                        'Authorization': `Bearer ${process.env.VFD_ACCESS_TOKEN}`,
                    }
                };

                /* ------------------------------ AXIOS REQUEST ----------------------------- */
                await axios.post(process.env.VFD_BASE_URL+
                    "/wallet2/clientdetails/create?wallet-credentials="+process.env.VFD_WALLET_CREDENTIALS, 
                    requestData, config)
                .then(response => {
                    
                    const responseData = response.data;
                    const data = responseData.data;
                    const accountNum = data.accountNo;
    
                    let vfdWallet = VfdWallet.create({
                        user_id:user.id,
                        account_number:accountNum
                    });
                    if(vfdWallet){
                        res.status(200).json({
                            error:false,
                            message: "Wallet created successfully",
                            data: {accountNo:accountNum}
                        })
                    }else{
                        res.status(400).json({
                            error:true,
                            message:"Request failed"
                        })
                    }
    
                    
                })
                .catch(error => {
                // Handle any errors
                    res.status(500).json({ error: 'An error occurred: ' + error});
                });
                /* ------------------------------ AXIOS REQUEST ----------------------------- */
            }

        } catch (e) {
            var logError = await ErrorLog.create({
                error_name: "Error on creating Vfd wallet",
                error_description: e.toString(),
                route: "/api/vfdwallet/create",
                error_code: "500"
            });
            if (logError) {
                return res.status(500).json({
                    error: true,
                    message: 'Unable to complete request at the moment '+e.toString()
                })

            }
        }
    }

    static async getRecentTransactions(req, res) {
        try {
            let user = req.global.user;
            let transactions = await Transaction.findAll({
                where: { 
                    [Op.or]: [
                        {recipient_id: user.id},
                        {user_id: user.id}
                    ]
                },
                limit: 10
            });

            if (transactions) {
                return res.status(200).json({
                    error: false,
                    message: "Success",
                    data: transactions
                });
            } else {
                return res.status(400).json({
                    error: true,
                    message: "Bad Request",
                    data: {}
                });
            }

        } catch (e) {
            var logError = await ErrorLog.create({
                error_name: "Error on getting recent transactions",
                error_description: e.toString(),
                route: "/api/wallet/recent",
                error_code: "500"
            });
            if (logError) {
                return res.status(500).json({
                    error: true,
                    message: 'Unable to complete request at the moment' + e.toString()
                })
            }
        }
    }
    /* ---------------------------- * GRAB WALLET DETAILS * ---------------------------- */
    static async getWalletByUserId(req, res) {

        const errors = validationResult(req);
        try {
            var findWallet = await Wallet.findAll({
                where: { user_id: req.global.user.id }
            });

            if (findWallet.length > 0) {
                return res.status(200).json({
                    error: false,
                    message: "Wallet retrieved successfully",
                    data: findWallet
                })
            } else {
                return res.status(400).json({
                    error: true,
                    message: "No Wallet found",
                    data: []
                })
            }
        } catch (e) {
            var logError = await ErrorLog.create({
                error_name: "Error on getting all Wallet details by userID",
                error_description: e.toString(),
                route: `/api/wallet/user_id`,
                error_code: "500"
            });
            if (logError) {
                return res.status(500).json({
                    error: true,
                    message: 'Unable to complete request at the moment' + e.toString()
                })
            }
        }
    }


    /* ----------------------------- ADDED FUNCTIONS ---------------------------- */
    static async getAllRecentTransactions(req, res) {
        try {
            let user = req.global.user;
            let transactions = await Transaction.findAll({
                where: { 
                    [Op.or]: [
                        {recipient_id: user.id},
                        {user_id: user.id}
                    ] 
                }
            });

            if (transactions) {
                return res.status(200).json({
                    error: false,
                    message: "Success",
                    data: transactions
                });
            } else {
                return res.status(400).json({
                    error: true,
                    message: "Bad Request",
                    data: {}
                });
            }

        } catch (e) {
            var logError = await ErrorLog.create({
                error_name: "Error on getting all recent transactions",
                error_description: e.toString(),
                route: "/api/wallet/allrecent",
                error_code: "500"
            });
            if (logError) {
                return res.status(500).json({
                    error: true,
                    message: 'Unable to complete request at the moment' + e.toString()
                })
            }
        }
    }

    static async getOneTransaction(req, res) {
        try {
            let user = req.global.user;
            let transactions = await Transaction.findAll({
                where: { 
                    recipient_id: user.id,
                    transaction_id: req.params.transaction_id 
                },
                include: [
                    IncludeRecipient,
                    IncludeSeller,
                ]
            });

            if (transactions) {
                return res.status(200).json({
                    error: false,
                    message: "Success",
                    data: transactions
                });
            } else {
                return res.status(400).json({
                    error: true,
                    message: "Bad Request",
                    data: {}
                });
            }

        } catch (e) {
            var logError = await ErrorLog.create({
                error_name: "Error on getting one transaction by transaction_id",
                error_description: e.toString(),
                route: "/api/wallet/transactions/:transaction_id",
                error_code: "500"
            });
            if (logError) {
                return res.status(500).json({
                    error: true,
                    message: 'Unable to complete request at the moment' + e.toString()
                })
            }
        }
    }
}

module.exports = VfdwalletController;