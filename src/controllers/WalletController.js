const { validationResult } = require("express-validator");
const { Op } = require("sequelize");
const { IncludeRecipient, IncludeSeller } = require("~database/helpers/modelncludes");
const { Wallet, Transaction, ErrorLog } = require("~database/models");



class WalletController {
    /* ------------------------------  ----------------------------- */
    static async getBalance(req, res) {
        try {
            let user = req.global.user;
            let wallet = await Wallet.findOne({
                where: { user_id: user.id }
            });

            if (wallet) {
                return res.status(200).json({
                    error: false,
                    message: "Success",
                    data: { balance: wallet.balance }
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
                error_name: "Error on getting wallet balance",
                error_description: e.toString(),
                route: "/api/wallet/balance",
                error_code: "500"
            });
            if (logError) {
                return res.status(500).json({
                    error: true,
                    message: 'Unable to complete request at the moment',
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

module.exports = WalletController;