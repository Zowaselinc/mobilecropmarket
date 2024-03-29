const generateTimestamps = require("./timestamps");

let Schema = (Sequelize, mode) => {
    return {
        user_id: {
            type : Sequelize.INTEGER,
            allowNull : false
        },
        account_number : {
            type : Sequelize.STRING,
            allowNull : false
        },
        ...generateTimestamps(Sequelize,mode)
    }
}
const Model = (sequelize, instance, Sequelize) => {
    // Define initial for DB sync
    sequelize.define("vfdwallets", Schema(Sequelize,1),{ timestamps: false });
    // Bypass initial instance to cater for timestamps
    const VfdWallet = instance.define("vfdwallets", Schema(Sequelize,2),{ timestamps: false });
    return VfdWallet;
}

module.exports = { Schema , Model};