const generateTimestamps = require("./timestamps");

let Schema = (Sequelize,mode) => {
    return {
        user_id : {
            type: Sequelize.INTEGER,
            unique : true,
            allowNull : false
        },
        partnership_type : {
            type: Sequelize.STRING,
            allowNull : false
        },
        ...generateTimestamps(Sequelize,mode)
    }
}
const Model = (sequelize, instance, Sequelize) => {
    // Define initial for DB sync
    sequelize.define("partners", Schema(Sequelize,1),{ timestamps: false });
    // Bypass initial instance to cater for timestamps
    const Partner = instance.define("partners", Schema(Sequelize,2),{ timestamps: false });
    return Partner;
}

module.exports = { Schema , Model};