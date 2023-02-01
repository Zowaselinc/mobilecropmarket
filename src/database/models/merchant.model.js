const generateTimestamps = require("./timestamps");

let Schema = (Sequelize,mode) => {
    return {
        user_id : {
            type: Sequelize.INTEGER,
            unique : true,
            allowNull : false
        },
        type_id:{
            type : Sequelize.INTEGER,
            allowNull : false
        },
        ...generateTimestamps(Sequelize,mode)
    }
}
const Model = (sequelize, instance, Sequelize) => {
    // Define initial for DB sync
    sequelize.define("merchants", Schema(Sequelize,1),{ timestamps: false });
    // Bypass initial instance to cater for timestamps
    const Merchant = instance.define("merchants", Schema(Sequelize,2),{ timestamps: false });
    return Merchant;
}

module.exports = { Schema , Model};