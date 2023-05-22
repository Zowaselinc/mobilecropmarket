const { validationResult } = require("express-validator");
const { Crop, ErrorLog, Order, User, Company } = require("~database/models");
const bcrypt = require('bcryptjs');
var appRoot = require("app-root-path");
const md5 = require("md5");
const FileService = require("~services/file");

class AccountController {
    /* ------------------------------  ----------------------------- */
    static async updateAccountDetails(req, res) {
        let sampleFile;
        let uploadPath;
        let profileImagePath;
        const errors = validationResult(req);

        try {
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: true,
                    message: "All fields are required",
                    data: errors,
                });
            }

            if (req.files && Object.keys(req.files).length > 0) {

                let image = Object.keys(req.files)[0];

                // var file = req.files[image];
                // var extension = file.mimetype.split("/")[1];
                // var newName =
                //     md5(file.name + new Date().toDateString()) + `.${extension}`;
                // profileImagePath = `/data/profile/${newName}`;

                // sampleFile = file;
                // uploadPath = `${appRoot}/public${profileImagePath}`;

                // sampleFile.mv(uploadPath, function (err) {
                //     if (err) {
                //         return res.status(500).send(err + " Error in uploading file");
                //     }
                // });
                var url = await FileService.uploadFile(image);
            }

            const user = await User.update({
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                phone: req.body.phone,
                state: req.body.state,
                city: req.body.city,
                country: req.body.country,
                primary_address: req.body.address,
                // ...(profileImagePath ? { image: profileImagePath } : {})
                ...(url ? { image: url } : {})
            }, {
                where: { id: req.global.user.id }
             })

            if (user) {
        
                let theuser = await User.findOne({
                    where: { id: req.global.user.id },
                    
                        include: [
                            { model: Company, as: "company" }
                        ]
                        
                });

                return res.status(200).json({
                    error: false,
                    message: "Account data updated successfully",
                    data: theuser
                });
            } else {
                return res.status(400).json({
                    error: true,
                    message: "Could not update user data",
                });
            }
        } catch (e) {
            var logError = await ErrorLog.create({
                error_name: "Error on updating acount details",
                error_description: e.toString(),
                route: "/api/users/account",
                error_code: "500",
            });
            if (logError) {
                return res.status(500).json({
                    error: true,
                    message: "Unable to complete request at the moment",
                });
            }
        }
    }


    static async updateAccountProfilePicture(req, res) {
        const errors = validationResult(req);

        try {
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: true,
                    message: "All fields are required",
                    data: errors,
                });
            }

            
            // if (!req.files || Object.keys(req.files).length === 0) {
            //     return res.status(400).json({
            //         "error": true,
            //         "message": "No files were uploaded."
            //     });
            // } else {
                // let allImages = Object.keys(req.files);
                /* -------------------------- MOVE UPLOADED FOLDER -------------------------- */
                // let my_object = [];
                // for (let i = 0; i < allImages.length; i++) {
                //     if (req.files[allImages[i]]) {
                //         let image = req.files[allImages[i]];
                //         var url = await FileService.uploadFile(image);
                //         my_object.push(url);
                //     }
                // }
                /* -------------------------- MOVE UPLOADED FOLDER -------------------------- */
                
                const user = await User.update({
                    image: req.body.image 
                }, {
                    where: { id: req.global.user.id }
                })

                if (user) {
            
                    let theuser = await User.findOne({
                        where: { id: req.global.user.id },
                        include: [
                            { model: Company, as: "company" }
                        ]    
                    });

                    return res.status(200).json({
                        error: false,
                        message: "Profile picture updated successfully",
                        data: theuser
                    });
                } else {
                    return res.status(400).json({
                        error: true,
                        message: "Could not update user profile picture",
                    });
                }

            // }
          
        } catch (e) {
            var logError = await ErrorLog.create({
                error_name: "Error on updating profile picture",
                error_description: e.toString(),
                route: "/api/users/account/profilepicture",
                error_code: "500",
            });
            if (logError) {
                console.log(e);
                return res.status(500).json({
                    error: true,
                    message: "Unable to complete request at the moment",
                });
            }
        }
    }



    static async updateCompanyDetails(req, res) {

        const errors = validationResult(req);

        try {
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: true,
                    message: "All fields are required",
                    data: errors,
                });
            }

            //Check for company 
            const company = await Company.findOne({
                where: { user_id: req.global.user.id }
            });

            if (!company) {
                return res.status(400).json({
                    error: true,
                    message: "No such company found",
                });
            } else {

                company.company_name = req.body.company_name;
                company.country = req.body.company_country;
                company.company_address = req.body.company_address;
                company.company_email = req.body.email;
                company.contact_person = req.body.contact_person;
                company.company_phone = req.body.phone;
                company.state = req.body.state;
                company.company_website = req.body.company_website;

                // company.save();
                if(company.save()){
                    setTimeout(async function(){
                        let theuser = await User.findOne({
                            where: { id: req.global.user.id },
                            include: [
                                { model: Company, as: "company" }
                            ]  
                        });

                        return res.status(200).json({
                            error: false,
                            message: "Company data updated successfully",
                            data: theuser
                        });
                    },2000)
                    
                }
                
            }

        } catch (e) {
            var logError = await ErrorLog.create({
                error_name: "Error on updating company details",
                error_description: e.toString(),
                route: "/api/company",
                error_code: "500",
            });
            if (logError) {
                return res.status(500).json({
                    error: true,
                    message: "Unable to complete request at the moment",
                });
            }
        }
    }

    static async changePassword(req, res) {

        const errors = validationResult(req);

        try {
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: true,
                    message: "All fields are required",
                    data: errors,
                });
            }
            const user = await User.findOne({
                where: { id: req.global.user.id }
            });

            if (!user) {
                return res.status(400).json({
                    error: true,
                    message: "Could not complete the process",
                });
            } else {
                const encrypt = await bcrypt.compare(req.body.current_password, user.password);

                if (encrypt) {

                    if (req.body.new_password != req.body.confirm_password) {
                        return res.status(400).json({
                            error: true,
                            message: "Passwords do not match",
                        });
                    }

                    user.password = await bcrypt.hash(req.body.new_password, 10);
                    user.save();

                    return res.status(200).json({
                        error: false,
                        message: "Password changed successfully",
                    });
                } else {
                    return res.status(400).json({
                        error: true,
                        message: "Could not change password, current password incorrect",
                    });
                }
            }

        } catch (e) {
            var logError = await ErrorLog.create({
                error_name: "Error on updating company details",
                error_description: e.toString(),
                route: "/api/company",
                error_code: "500",
            });
            if (logError) {
                return res.status(500).json({
                    error: true,
                    message: "Unable to complete request at the moment",
                });
            }
        }

    }
}
module.exports = AccountController;