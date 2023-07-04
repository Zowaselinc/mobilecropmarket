const { validationResult } = require("express-validator");
const { Crop, ErrorLog, Order, User, Company, KYC, VfdWallet } = require("~database/models");
const bcrypt = require('bcryptjs');
const OnfidoInstance = require("~providers/Onfido");
var base64 = require('base64-stream');
const axios = require('axios');


const { EncryptConfig, DecryptConfig } = require("~utilities/encryption/encrypt");
const FileService = require("~services/file");
const QoreIDToken = require("~services/qoreid");

class KYCController {
    /* ------------------------------  ----------------------------- */
    static async startKycVerification(req, res) {

        const errors = validationResult(req);

        try {
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: true,
                    message: "All fields are required",
                    data: errors,
                });
            }
            const body = req.body;

            if (!req.files || Object.keys(req.files).length === 0) {
                return res.status(400).json({
                    error: true,
                    message: "No files were uploaded.",
                });
            } else {

                var fileKeys = Object.keys(req.files);

                if (!fileKeys.includes('front')) {
                    return res.status(400).json({
                        error: true,
                        message: "ID Front is required",
                    });
                }

                if (!fileKeys.includes('back')) {
                    return res.status(400).json({
                        error: true,
                        message: "ID Back is required",
                    });
                }

                var userData = req.global.user;


                let applicant = await OnfidoInstance.createNewApplicant({
                    ...{
                        first_name: userData.first_name,
                        last_name: userData.last_name,
                        email: userData.email,
                        dob: userData.dob,
                        country: userData.country
                    },
                    ...req.body
                });

                
                if (applicant) {
                    //SAVES USER APPLICANT_ID
                    let userKyc;

                    var obj = new Object();
                    obj = {"front":body.img1, "back":body.img2}
                    try {
                        userKyc = await KYC.create({
                            user_id: userData.id,
                            applicant_id: applicant.id,
                            verified: 0,
                            bvn: EncryptConfig(body.bvn),
                            id_type: body.id_type,
                            id_number: body.id_number,
                            files: JSON.stringify(obj)
                        });
                    } catch (error) {
                        console.log(error)
                    }

 
                } else {
                    return res.status(400).json({
                        error: true,
                        message: "An Error Occurred",
                    });
                }

                //UPDATES USER RECORD
                const user = await User.update({
                    first_name: body.first_name,
                    last_name: body.last_name,
                    phone_number: body.phone,
                    dob: body.dob,
                    country: body.country,
                    state: body.state,
                    gender: body.gender,
                    city: body.city,
                    address: body.address
                }, { where: { id: userData.id } });



                /* ---------------------------- CHECKS DOCUMENTS ---------------------------- */
                let allImages = Object.keys(req.files);
                for (let index = 0; index < allImages.length; index++) {
                    const imageKey = allImages[index];
                    var uploaded = await OnfidoInstance.uploadDocument(req.files[imageKey], imageKey);

                }
                var response = await OnfidoInstance.checkDocument();
                if (response) {
                    try {

                        const user = await KYC.update({
                            status: "pending",
                            check_id: response.id,
                        }, { where: { user_id: userData.id } });

                    } catch (error) {
                        console.log(error);
                    }
                    var data = req.body
                    console.log("Data for Onfido", data);

                    /* ------------------------------- VFD WALLET ------------------------------- */
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
                            firstname:body.first_name,
                            lastname:body.last_name,
                            middlename:"",
                            dob:body.dob,
                            gender:body.gender,
                            phone:body.phone,
                            bvn:body.bvn
                        };
                        let VFD_ACCESS_TOKEN = "8762fd77-a43a-3402-b0da-2da62e51efb8";
                        const config = {
                            headers: {
                                // 'Authorization': `Bearer ${process.env.VFD_ACCESS_TOKEN}`,
                                'Authorization': `Bearer ${VFD_ACCESS_TOKEN}`,
                            }
                        };

                    //     /* ------------------------------ AXIOS REQUEST ----------------------------- */
                        let VFD_BASE_URL = "https://api-devapps.vfdbank.systems/vtech-wallet/api/v1";
                        let VFD_WALLET_CREDENTIALS = "YkpudnVnRVVnTEJfYldLZGZqazVUMG04TXE0YTo0ODJhZDJhUUhrV0JmekJaRjJBVVR2NWY5a29h";
                        // await axios.post(process.env.VFD_BASE_URL+
                        //     "/wallet2/clientdetails/create?wallet-credentials="+process.env.VFD_WALLET_CREDENTIALS, 
                        await axios.post(VFD_BASE_URL+
                            "/wallet2/clientdetails/create?wallet-credentials="+VFD_WALLET_CREDENTIALS, 
                            requestData, config)
                        .then(response => {
                            
                            const responseData = response.data;
                            const data = responseData.data;
                            // console.log(response);
                            const accountNum = data.accountNo;
            
                            let vfdWallet = VfdWallet.create({
                                user_id:user.id,
                                account_number:accountNum
                            });
                            if(vfdWallet){
                                // res.status(200).json({
                                //     error:false,
                                //     message: "Wallet created successfully",
                                //     data: {accountNo:accountNum}
                                // })
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
                            var logError = ErrorLog.create({
                                error_name: "Error on creating VFD account",
                                error_description: error.toString(),
                                route: req.route.path,
                                error_code: "500",
                            });
                        });
                    //     /* ------------------------------ AXIOS REQUEST ----------------------------- */



                    }
                    /* ------------------------------- VFD WALLET ------------------------------- */


                    /* ------------------------- QOREID KYC VERIFICATION ------------------------ */
                    // Code in anotherFunction
                    let vnin = "JZ426633988976CH";
                    const req1 = {
                        "firstname": body.first_name,
                        "lastname": body.last_name,
                        "phone": body.phone,
                        "dob": body.dob,
                        "email": null,
                        "gender": body.gender
                    };
                    let qoretoken = await QoreIDToken.getToken();
                    if(qoretoken){
                        console.log("token ", qoretoken);
                        const result = await KYCController.qorevNINVerification(qoretoken, vnin, req1, res);
                        // // Call qorevNINVerification and await its completion
                        console.log("Trial result ", result);
                        if(result=="verified"){
                            const user = await KYC.update({
                                status: "complete",
                                verified: 1,
                            }, { where: { user_id: userData.id } });
                        }else{
                            const user = await KYC.update({
                                verified: 0,
                            }, { where: { user_id: userData.id } });
                        }
                    }

                    // Code in anotherFunction
                    /* ------------------------- QOREID KYC VERIFICATION ------------------------ */


                    return res.status(200).json({
                        error: false,
                        message: "Successful",
                        data: { response: response },
                        user: { userData, data },

                    });
                } else {
                    return res.status(400).json({
                        error: true,
                        message: "An Error Occured Try Again",
                    });
                }

            }

        } catch (e) {
            var logError = await ErrorLog.create({
                error_name: "Error on Start KYC",
                error_description: e.toString(),
                route: req.route.path,
                error_code: "500",
            });
            if (logError) {
                return res.status(500).json({
                    error: true,
                    message: "Unable to complete request at the moment "+e.toString(),
                });
            }
        }
    }

    static async getDocumentTypes(req, res) {
        return res.status(200).json({
            error: false,
            types: ["identity_card", "driving_licence", "voter_id", "passport"]
        });
    }

    static async checkycStatus(req, res) {
        try {
            var userData = req.global.user;
            var kycDataObj, kybDataObj;

            if (req.global.kyc) {
                let data = req.global.kyc;
                kycDataObj = data;
            }
            if (req.global.kyb) {
                let data = req.global.kyb;
                kybDataObj = data;
            }

            if (!kycDataObj) {
                kycDataObj = null;
            }
            if (!kybDataObj) {
                kybDataObj = null;
            }
                
            return res.status(200).json({
                error: false,
                message: "KYC and KYB status fetched",
                data: { kyc: kycDataObj, kyb: kybDataObj }
            });
        } catch (error) {
            console.log("catched error", error.toString());
        }   

    }

    static async retriveCheck(req, res) {

        var userData = req.global.user;
        var kycDataObj;

        if (req.global.kyc) {
            let data = req.global.kyc;
            kycDataObj = data;

        }
        if (!kycDataObj) {
            return res.status(200).json({
                error: false,
                message: "KYC not started",
                data: { status: "Unverified" }
            });
        }


        try {
            var doc = await OnfidoInstance.retriveDocument(kycDataObj.check_id);
            try {
                const user = await KYC.update({
                    status: doc.status
                }, { where: { user_id: userData.id } });

            } catch (error) {
                console.log(error);
            }
            if (doc) {

                var documentList = await OnfidoInstance.listDocument(kycDataObj.applicant_id);
                for (let index = 0; index < documentList.length; index++) {
                    const document = documentList[index];
                    const downloadDocument = await OnfidoInstance.downloadDocument(document.id);
                    var base64 = await KYCController.streamToBase64(downloadDocument.asStream());
                    var applicant = await OnfidoInstance.retrieveApplicant(kycDataObj.applicant_id);
                    applicant['bvn'] = DecryptConfig(kycDataObj.bvn);
                    documentList[index]['base64'] = `data:${downloadDocument.contentType};base64,${base64}`;
                }
                return res.status(200).json({
                    error: false,
                    message: "Successful",
                    data: {
                        status: kycDataObj.verified == 1 ? "Verified" : "Pending Verification",
                        documents: documentList,
                        applicant: applicant
                    }
                });
            } else {
                return res.status(400).json({
                    error: true,
                    message: "An Error Occured Try again",
                });
            }
        }
        catch (error) {

        }
    }

    static async listCheck(req, res) {
        const errors = validationResult(req);
        try {
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: true,
                    message: "applicant_id fields are required",
                    data: errors,
                });
            } else {
                var doc = await OnfidoInstance.listCheck(req.body.applicant_id)
                if (doc) {
                    return res.status(200).json({
                        error: false,
                        message: "Successful",
                        data: { response: doc },
                    });
                } else {
                    return res.status(400).json({
                        error: true,
                        message: "An Error Occured Try again",
                    });
                }
            }
        } catch (error) {

        }
    }



    static async downloadCheck(req, res) {
        const errors = validationResult(req);
        try {
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: true,
                    message: "id fields are required",
                    data: errors,
                });
            } else {

                var doc = await OnfidoInstance.downloadCheck(req.body.id);
                // console.log(Object.keys(OnfidoDownload));
                // console.log(Object.keys(doc));
                // console.log(doc.responseUrl);
                // console.log("doc.asStream");
                //console.log(doc.)
                if (doc) {
                    return res.status(200).json({
                        error: false,
                        message: "Successful",
                        data: { response: doc.asStream },
                    });
                } else {
                    return res.status(400).json({
                        error: true,
                        message: "An Error Occured Try again",
                    });
                }
            }
        } catch (error) {

        }
    }
    static streamToBase64 = (stream) => {
        const concat = require('concat-stream')
        const { Base64Encode } = require('base64-stream')

        return new Promise((resolve, reject) => {
            const base64 = new Base64Encode()

            const cbConcat = (base64) => {
                resolve(base64)
            }

            stream
                .pipe(base64)
                .pipe(concat(cbConcat))
                .on('error', (error) => {
                    reject(error)
                })
        })
    }

    static async getDocument(req, res) {
        var data;
        var doc = await OnfidoInstance.downloadDocument(req.params.id);
        res.setHeader('Content-Type', doc.contentType);
        var stream = doc.asStream();
        stream.pipe(res);
    }



    /* ------------------------- QOREID KYC VERIFICATION ------------------------ */
    static async qorevNINVerification(qoretoken, vnin, req, res) {

        const errors = validationResult(req);
        let verificationresult;

        console.log("req ", req);
        console.log("the qoretoken ", qoretoken);

        // verificationresult = "verified "+vnin;
        // return verificationresult;
        try {
            // if (!errors.isEmpty()) {
            //     return res.status(400).json({
            //         error: true,
            //         message: "All fields are required",
            //         data: errors,
            //     });
            // }
            // const body = req.body;
            const body = req;
            const params = req.params;

            if (!vnin || vnin === "") {
                console.log('No vnin ', vnin);
                return res.status(400).json({
                    error: true,
                    message: "vNIN is required",
                });
            } else {
                console.log('vnin exists ', vnin);
                console.log("Inside Qoretoken "+qoretoken);
                // return "Good boy";
                
                    /* ------------------------------ AXIOS REQUEST ----------------------------- */
                    // let VFD_BASE_URL = "https://api-devapps.vfdbank.systems/vtech-wallet/api/v1";
                    // let VFD_WALLET_CREDENTIALS = "YkpudnVnRVVnTEJfYldLZGZqazVUMG04TXE0YTo0ODJhZDJhUUhrV0JmekJaRjJBVVR2NWY5a29h";
                    const requestData = {
                        "firstname": body.firstname,
                        "lastname": body.lastname,
                        "phone": body.phone,
                        "dob": body.dob,
                        "email": body.email,
                        "gender": body.gender
                    };
                    const config = {
                        headers: {
                            'Authorization': `Bearer ${qoretoken}`,
                        }
                    };

                    await axios.post(process.env.QOREID_BASE_URL+
                        "/v1/ng/identities/virtual-nin/"+vnin, 
                        requestData, config)
                    .then(response => {
                        console.log("response ",response.data);
                        
                        // const responseData = response.data;
                        // res.status(200).json({
                        //     error:false,
                        //     message: "vNIN Verification result retrieved",
                        //     data: response.data
                        // })

                        if(response.data.status.status == "verified"){
                            verificationresult = "verified";
                        }else{
                            verificationresult = "unverified";
                        }
                        return verificationresult;
                    })
                    .catch(error => {
                    // Handle any errors
                        // res.status(500).json({ error: 'An error occurred: ' + error});
                        let axoiserror = error.response.data;
                        var logError = ErrorLog.create({
                            error_name: "Error on running vNIN Verification",
                            error_description: error.toString(),
                            route: req.route.path,
                            error_code: "500",
                        });
                        // console.log("Error "+error.toString());
                        if(axoiserror.statusCode==400){
                            res.status(400).json({
                                error:true,
                                message: axoiserror.message
                            })
                        }else{
                            res.status(400).json({error:true,message: "There may be an error in your voter's ID number"})
                        }
                    });
                    return verificationresult;
                    /* ------------------------------ AXIOS REQUEST ----------------------------- */
                // }else{
                //     return res.status(400).json({
                //         error: true,
                //         message: "Failed to retrive authentication token",
                //     });
                // }
            }
        } catch (e) {
            var logError = await ErrorLog.create({
                error_name: "Error on Voter's Card Verification",
                error_description: e.toString(),
                route: req.route.path,
                error_code: "500",
            });
            if (logError) {
                return res.status(500).json({
                    error: true,
                    message: "Unable to complete request at the moment"+e.toString(),
                });
            }
        }
    }


    static async qoreVoterCardVerification(req, res) {

        const errors = validationResult(req);

        try {
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: true,
                    message: "All fields are required",
                    data: errors,
                });
            }
            const body = req.body;
            const params = req.params;

            if (!params.vin || params.vin === "") {
                return res.status(400).json({
                    error: true,
                    message: "Voter ID number is required",
                });
            } else {
                var userData = req.global.user;

                let qoretoken = await QoreIDToken.getToken();
                // console.log("Qoretoken "+qoretoken);
                if(qoretoken){
                    /* ------------------------------ AXIOS REQUEST ----------------------------- */
                    const requestData = {
                        "firstname": body.firstname,
                        "lastname": body.lastname,
                        "dob": body.dob
                    };
                    const config = {
                        headers: {
                            'Authorization': `Bearer ${qoretoken}`,
                        }
                    };

                    await axios.post(process.env.QOREID_BASE_URL+
                        "/v1/ng/identities/vin/"+params.vin, 
                        requestData, config)
                    .then(response => {
                        // console.log("response ",response.data);
                        
                        // const responseData = response.data;
                        res.status(200).json({
                            error:false,
                            message: "Voter's card verification result retrieved",
                            data: response.data
                        })
                    })
                    .catch(error => {
                        let axoiserror = error.response.data;
                    // Handle any errors
                        // res.status(500).json({ error: 'An error occurred: ' + error});
                        var logError = ErrorLog.create({
                            error_name: "Error on running voter's card verification",
                            error_description: error.toString(),
                            route: req.route.path,
                            error_code: "500",
                        });
                        // console.log("Error "+error.toString());
                        // console.log(axoiserror);
                        if(axoiserror.statusCode==400){
                            res.status(400).json({
                                error:true,
                                message: axoiserror.message
                            })
                        }else{
                            res.status(400).json({error:true,message: "There may be an error in your voter's ID number"})
                        }
                    });
                    /* ------------------------------ AXIOS REQUEST ----------------------------- */
                }else{
                    return res.status(400).json({
                        error: true,
                        message: "Failed to retrive authentication token",
                    });
                }
            }

        } catch (e) {
            var logError = await ErrorLog.create({
                error_name: "Error on Voter's card Verification",
                error_description: e.toString(),
                route: req.route.path,
                error_code: "500",
            });
            if (logError) {
                return res.status(500).json({
                    error: true,
                    message: "Unable to complete request at the moment"+e.toString(),
                });
            }
        }
    }


    static async qoreDriverLicenseVerification(req, res) {

        const errors = validationResult(req);

        try {
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: true,
                    message: "All fields are required",
                    data: errors,
                });
            }
            const body = req.body;
            const params = req.params;

            if (!params.driverid || params.driverid === "") {
                return res.status(400).json({
                    error: true,
                    message: "Driver ID number is required",
                });
            } else {
                var userData = req.global.user;

                let qoretoken = await QoreIDToken.getToken();
                // console.log("Qoretoken "+qoretoken);
                if(qoretoken){
                    /* ------------------------------ AXIOS REQUEST ----------------------------- */
                    const requestData = {
                        "firstname": body.firstname,
                        "lastname": body.lastname,
                        "dob": body.dob,
                        "phone": body.phone,
                        "email": body.email,
                        "gender": body.gender
                    };
                    const config = {
                        headers: {
                            'Authorization': `Bearer ${qoretoken}`,
                        }
                    };

                    await axios.post(process.env.QOREID_BASE_URL+
                        "/v1/ng/identities/drivers-license/"+params.driverid, 
                        requestData, config)
                    .then(response => {
                        // console.log("response ",response.data);
                        // const responseData = response.data;
                        res.status(200).json({
                            error:false,
                            message: "Driver's license verification result retrieved",
                            data: response.data
                        })
                    })
                    .catch(error => {
                        let axoiserror = error.response.data;
                    // Handle any errors
                        // res.status(500).json({ error: 'An error occurred: ' + error});
                        var logError = ErrorLog.create({
                            error_name: "Error on running driver's license verification",
                            error_description: error.toString(),
                            route: req.route.path,
                            error_code: "500",
                        });
                        // console.log("Error "+error.toString());
                        // console.log(axoiserror);
                        if(axoiserror.statusCode==400){
                            res.status(400).json({
                                error:true,
                                message: axoiserror.message
                            })
                        }else{
                            res.status(400).json({error:true,message: "There may be an error in your driver's license number"})
                        }
                    });
                    /* ------------------------------ AXIOS REQUEST ----------------------------- */
                }else{
                    return res.status(400).json({
                        error: true,
                        message: "Failed to retrive authentication token",
                    });
                }
            }

        } catch (e) {
            var logError = await ErrorLog.create({
                error_name: "Error on Driver's license Verification",
                error_description: e.toString(),
                route: req.route.path,
                error_code: "500",
            });
            if (logError) {
                return res.status(500).json({
                    error: true,
                    message: "Unable to complete request at the moment"+e.toString(),
                });
            }
        }
    }


    static async qoreNigeriaPassportVerification(req, res) {

        const errors = validationResult(req);

        try {
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: true,
                    message: "All fields are required",
                    data: errors,
                });
            }
            const body = req.body;
            const params = req.params;

            if (!params.passportno || params.passportno === "") {
                return res.status(400).json({
                    error: true,
                    message: "Passport number is required",
                });
            } else {
                var userData = req.global.user;

                let qoretoken = await QoreIDToken.getToken();
                // console.log("Qoretoken "+qoretoken);
                if(qoretoken){
                    /* ------------------------------ AXIOS REQUEST ----------------------------- */
                    const requestData = {
                        "firstname": body.firstname,
                        "lastname": body.lastname,
                        "dob": body.dob,
                        "gender": body.gender
                    };
                    const config = {
                        headers: {
                            'Authorization': `Bearer ${qoretoken}`,
                        }
                    };

                    await axios.post(process.env.QOREID_BASE_URL+
                        "/v1/ng/identities/passport/"+params.passportno, 
                        requestData, config)
                    .then(response => {
                        // console.log("response ",response.data);
                        // const responseData = response.data;
                        res.status(200).json({
                            error:false,
                            message: "Passport verification result retrieved",
                            data: response.data
                        })
                    })
                    .catch(error => {
                        let axoiserror = error.response.data;
                    // Handle any errors
                        // res.status(500).json({ error: 'An error occurred: ' + error});
                        var logError = ErrorLog.create({
                            error_name: "Error on running passport verification",
                            error_description: error.toString(),
                            route: req.route.path,
                            error_code: "500",
                        });
                        // console.log("Error "+error.toString());
                        // console.log(axoiserror);
                        if(axoiserror.statusCode==400){
                            res.status(400).json({
                                error:true,
                                message: axoiserror.message
                            })
                        }else{
                            res.status(400).json({error:true,message: "There may be an error in your password number"})
                        }
                    });
                    /* ------------------------------ AXIOS REQUEST ----------------------------- */
                }else{
                    return res.status(400).json({
                        error: true,
                        message: "Failed to retrive authentication token",
                    });
                }
            }

        } catch (e) {
            var logError = await ErrorLog.create({
                error_name: "Error on Passport Verification",
                error_description: e.toString(),
                route: req.route.path,
                error_code: "500",
            });
            if (logError) {
                return res.status(500).json({
                    error: true,
                    message: "Unable to complete request at the moment"+e.toString(),
                });
            }
        }
    }
    /* ------------------------- QOREID KYC VERIFICATION ------------------------ */

}
module.exports = KYCController;