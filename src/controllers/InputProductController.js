const { request } = require("express");
const { Input, ErrorLog, Category, SubCategory, User } = require("~database/models");
const { validationResult } = require("express-validator");
const crypto = require("crypto");
const md5 = require("md5");
var appRoot = require("app-root-path");
const FileService = require("~services/file");

// const jwt = require("jsonwebtoken");

class InputProducts {
  static async createInput(req, res) {
    let sampleFile;
    let uploadPath;

    const errors = validationResult(req);

    let randomid = crypto.randomBytes(8).toString("hex");

    try {
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: true,
          message: "All fields are required",
          data: [],
        });
      }
      // if (!req.files || Object.keys(req.files).length === 0) {
      if (!req.body.images) {
        return res.status(400).json({
          error: true,
          message: "No input image(s) found.",
          data: [],
        });
      } else {
        // let allImages = Object.keys(req.files);

        /* -------------------------- MOVE UPLOADED FOLDER -------------------------- */
        // let my_object = [];
        // for (let i = 0; i < allImages.length; i++) {
        //   // var file = req.files[allImages[i]];
        //   // var extension = file.mimetype.split('/')[1];
        //   // var newName =
        //   //     md5(file.name + new Date().toDateString()) + `.${extension}`;
        //   // var imagePath = `/data/products/${newName}`;
        //   // my_object.push(imagePath);
        //   // sampleFile = file;
        //   // uploadPath = `${appRoot}/public${imagePath}`;
        //   // sampleFile.mv(uploadPath, function (err) {
        //   //     if (err) {
        //   //         return res.status(500).send(err + " Error in uploading file");
        //   //     }
        //   // });

        //   if (req.files[allImages[i]]) {

        //     let image = req.files[allImages[i]];

        //     var url = await FileService.uploadFile(image);

        //     my_object.push(url);
        //   }
        // }

        // Jst like php explode to change each item to string and be in an array, I will use split in JS
        let images = req.body.images;
        let imgArray = images.split(',');

        /* ------------------------ INSERT INTO PRODUCT TABLE ----------------------- */
        var input = await Input.create({
          user_id: req.global.user.id,
          category_id: req.body.category_id,
          subcategory_id: req.body.subcategory_id,
          product_type: req.body.product_type,
          crop_focus: req.body.crop_focus,
          packaging: req.body.packaging,
          description: req.body.description,
          stock: req.body.stock,
          usage_instruction: req.body.usage_instruction,
          stock: req.body.stock,
          kilograms: req.body.kilograms,
          grams: req.body.grams,
          liters: req.body.liters,
          images: JSON.stringify(imgArray),
          price: req.body.price,
          currency: req.body.currency,
          manufacture_name: req.body.manufacture_name,
          manufacture_date: req.body.manufacture_date,
          delivery_method: req.body.delivery_method,
          expiry_date: req.body.expiry_date,
          manufacture_country: req.body.manufacture_country,
          // state: req.body.state,
          video: req.body.video,
          active: 1,
        });

        /* ------------------------ INSERT INTO PRODUCT TABLE ----------------------- */

        if (input) {
          return res.status(200).json({
            error: false,
            message: "Input created successfully",
            data: [],
          });
        }
      }
    } catch (e) {
      var logError = await ErrorLog.create({
        error_name: "Error on adding an input",
        error_description: e.toString(),
        route: "/api/input/product/add",
        error_code: "500",
      });
      if (logError) {
        return res.status(500).json({
          error: true,
          message: "Unable to complete request at the moment" + e,
        });
      }
    }
  }

  static async EditById(req, res) {
    let sampleFile;
    let uploadPath;

    const errors = validationResult(req);

    let randomid = crypto.randomBytes(8).toString("hex");

    try {
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: true,
          message: "All fields are required",
          data: [],
        });
      }
      // if (!req.files || Object.keys(req.files).length === 0) {
      if (!req.body.images) {
        return res.status(400).json({
          error: true,
          message: "No input image(s) found.",
          data: [],
        });
      } else {
        // let allImages = Object.keys(req.files);

        // Jst like php explode to change each item to string and be in an array, I will use split in JS
        let images = req.body.images;
        let imgArray = images.split(',');

        /* ------------------------ UPDATE INTO INPUT TABLE ----------------------- */
        var findInput = await Input.findOne({ where: { id: req.params.input_id } });
        if(findInput){
          var input = await Input.update({
            // user_id: req.global.user.id,
            category_id: req.body.category_id,
            subcategory_id: req.body.subcategory_id,
            product_type: req.body.product_type,
            crop_focus: req.body.crop_focus,
            packaging: req.body.packaging,
            description: req.body.description,
            stock: req.body.stock,
            usage_instruction: req.body.usage_instruction,
            stock: req.body.stock,
            kilograms: req.body.kilograms,
            grams: req.body.grams,
            liters: req.body.liters,
            images: JSON.stringify(imgArray),
            price: req.body.price,
            currency: req.body.currency,
            manufacture_name: req.body.manufacture_name,
            manufacture_date: req.body.manufacture_date,
            delivery_method: req.body.delivery_method,
            expiry_date: req.body.expiry_date,
            manufacture_country: req.body.manufacture_country,
            // state: req.body.state,
            video: req.body.video,
            // active: 1,
          },{ where: { id: req.params.input_id } });

          if (input) {
            return res.status(200).json({
              error: false,
              message: "Input updated successfully",
              data: [],
            });
          }
        }
        /* ------------------------ UPDATE INTO INPUT TABLE ----------------------- */
      }
    } catch (e) {
      var logError = await ErrorLog.create({
        error_name: "Error on adding an input",
        error_description: e.toString(),
        route: "/api/input/product/add",
        error_code: "500",
      });
      if (logError) {
        return res.status(500).json({
          error: true,
          message: "Unable to complete request at the moment" + e,
        });
      }
    }
  }

  static async getAllInputsByUser(req, res) {
    try {
      var alluserinputs = await Input.findAll({
        include: [
          {
            model: Category,
            as: "category",
          },
          {
            model: SubCategory,
            as: "subcategory",
          },
          { model: User, as: "user" },
        ],
        where: {
          user_id: req.global.user.id,
          // active: 1,
        },
        order: [["id", "DESC"]],
      });

      if (alluserinputs.length > 0) {
        return res.status(200).json({
          error: false,
          message: "All Inputs returned successfully",
          data: alluserinputs,
        });
      } else {
        return res.status(200).json({
          error: false,
          message: "User does not have an input product",
          data: [],
        });
      }
    } catch (e) {
      var logError = await ErrorLog.create({
        error_name: "Error on getting all user Inputs",
        error_description: e.toString(),
        route: "/api/input/getallbyuserid/:user_id",
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

  static async getallInputs(req, res) {
    try {
      var alluserinputs = await Input.findAll({
        include: [
          { model: Category, as: "category" },
          { model: SubCategory, as: "subcategory" },
          { model: User, as: "user" },
        ],
        where: { active: 1 },
        order: [["id", "DESC"]],
      });



      if (alluserinputs.length > 0) {
        return res.status(200).json({
          error: false,
          message: "All Inputs returned successfully",
          data: alluserinputs,
        });
      } else {
        return res.status(200).json({
          error: false,
          message: "No input products found",
          data: [],
        });
      }
    } catch (e) {
      var logError = await ErrorLog.create({
        error_name: "Error on getting all Inputs",
        error_description: e.toString(),
        route: "/api/input/getall",
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

  static async getInputById(req, res) {
    try {
      var input = await Input.findOne({
        include: [
          { model: Category, as: "category" },
          { model: SubCategory, as: "subcategory" },
          { model: User, as: "user" },
        ],
        where: { id: req.params.input },
      });

      if (input) {
        return res.status(200).json({
          error: false,
          message: "Input returned successfully",
          data: input,
        });
      } else {
        return res.status(200).json({
          error: false,
          message: "No such input found",
          data: [],
        });
      }
    } catch (e) {
      var logError = await ErrorLog.create({
        error_name: "Error on getting input",
        error_description: e.toString(),
        route: "/api/input/:input",
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

  static async getallInputsByCategory(req, res) {
    try {
      var allInputs = await Input.findAll({
        where: {
          category: req.params.category,
        },
      });

      if (allInputs.length > 0) {
        return res.status(200).json({
          error: false,
          message: "All Inputs for this input type returned",
          data: allInputs,
        });
      } else {
        return res.status(200).json({
          error: false,
          message: "No input products found for this input type",
          data: [],
        });
      }
    } catch (e) {
      var logError = await ErrorLog.create({
        error_name: "Error on getting all Inputs by category",
        error_description: e.toString(),
        route: "/api/input/getallbycategory/:category",
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
  static async getallInputsByManufacturer(req, res) {
    try {
      var allInputs = await Input.findAll({
        where: {
          manufacture_name: req.params.manufacturer,
        },
      });

      if (allInputs.length > 0) {
        return res.status(200).json({
          error: false,
          message: "All Inputs for this manufacturer returned",
          data: allInputs,
        });
      } else {
        return res.status(200).json({
          error: false,
          message: "No input products found for this manufacturer",
          data: [],
        });
      }
    } catch (e) {
      var logError = await ErrorLog.create({
        error_name: "Error on getting all Inputs by manfacturer",
        error_description: e.toString(),
        route: "/api/input/getallbymanfacturer/:manfacturer",
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
  static async getallInputsByPackaging(req, res) {
    try {
      var allInputs = await Input.findAll({
        where: {
          packaging: req.params.packaging,
        },
      });

      if (allInputs.length > 0) {
        return res.status(200).json({
          error: false,
          message: "All Inputs for this packaging returned",
          data: allInputs,
        });
      } else {
        return res.status(200).json({
          error: false,
          message: "No input products found for this packaging",
          data: [],
        });
      }
    } catch (e) {
      var logError = await ErrorLog.create({
        error_name: "Error on getting all Inputs by packaging",
        error_description: e.toString(),
        route: "/api/input/getallbypackaging/:packaging",
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

  /* ---------------------------- Delete crop by id --------------------------- */

  static async deleteCropById(req, res) {
    const errors = validationResult(req);

    try {
      /* ------------------------ UPDATE INTO CROP TABLE ----------------------- */

      var crop = await Crop.findOne({ where: { id: req.params.id } });
      if (crop) {
        var type = crop.type;

        if (type == "wanted") {
          await CropRequest.destroy({
            where: {
              crop_id: req.params.id,
            },
          });
        }

        if (type == "auction") {
          await Auction.destroy({
            where: {
              crop_id: req.params.id,
            },
          });
        }

        crop.destroy();

        await CropSpecification.destroy({
          where: {
            model_type: "crop",
            model_id: req.params.id,
          },
        });

        return res.status(200).json({
          error: false,
          message: "Crop deleted successfully",
        });
      } else {
        return res.status(400).json({
          error: true,
          message: "No such crop found",
          data: req.body,
        });
      }
    } catch (e) {
      var logError = await ErrorLog.create({
        error_name: "Error on edit a crop",
        error_description: e.toString(),
        route: "/api/crop/delete",
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

  /* ---------------------------- Delete input by id --------------------------- */

  static async deleteInputById(req, res) {
    const errors = validationResult(req);

    try {
      /* ------------------------ UPDATE INTO CROP TABLE ----------------------- */

      var input = await Input.findOne({ where: { id: req.params.id } });
      if (input) {
        input.destroy();

        return res.status(200).json({
          error: false,
          message: "Input deleted successfully",
        });
      } else {
        return res.status(400).json({
          error: true,
          message: "No such input found",
          data: req.body,
        });
      }
    } catch (e) {
      var logError = await ErrorLog.create({
        error_name: "Error on edit a crop",
        error_description: e.toString(),
        route: "/api/crop/delete",
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

  static async deactivateInputById(req, res) {
    const errors = validationResult(req);

    try {
      /* ------------------------ UPDATE INTO CROP TABLE ----------------------- */

      var input = await Input.findOne({ where: { id: req.params.id } });
      if (input) {
        let responsemessage;
        if(req.params.activatetype=="deactivate"){
          input.active = 0;
          responsemessage = "Input deactivated successfully";
        }else{
          input.active = 1;
          responsemessage = "Input activated successfully";
        }
        // input.save();

        if(input.save()){
          return res.status(200).json({
            error: false,
            message: `${responsemessage}`,
            data: input
          });
        }else{
          return res.status(400).json({
            error: false,
            message: "Failed to make changes. Please try again.",
          });
        }
      } else {
        return res.status(400).json({
          error: true,
          message: "No such input found",
          data: req.body,
        });
      }
    } catch (e) {
      var logError = await ErrorLog.create({
        error_name: "Error on edit a crop",
        error_description: e.toString(),
        route: "/api/crop/delete",
        error_code: "500",
      });
      if (logError) {
        return res.status(500).json({
          error: true,
          message: "Unable to complete req at the moment "+e.toString(),
        });
      }
    }
  }
}

module.exports = InputProducts;