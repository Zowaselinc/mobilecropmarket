"use strict";
require('dotenv').config();

const axios = require('axios');
const { ErrorLog } = require("~database/models");

class QoreIDToken {
    
    static async getToken(){
        const requestData = {
            clientId: process.env.QOREID_CLIENTID,
            secret: process.env.QOREID_SECRET
        };
        let token;
        /* ------------------------------ AXIOS REQUEST ----------------------------- */
        await axios.post(process.env.QOREID_BASE_URL+
            "/token", 
            requestData)
        .then(response => {
            let responseData = response.data;
            let accessToken = responseData.accessToken;
            
            // console.log("accessTokenn",accessToken);
            // return accessToken.accessToken;
            token = accessToken;
        })
        .catch(error => {
        // Handle any errors
            res.status(500).json({ error: 'An error occurred: ' + error});
            var logError = ErrorLog.create({
                error_name: "Error on Creating QoreID token",
                error_description: error.toString(),
                route: req.route.path,
                error_code: "500",
            });
            console.log(error.toString());
            token = null;
        });
        /* ------------------------------ AXIOS REQUEST ----------------------------- */
        // console.log("token ", token);
        return token;
    }
}

module.exports = QoreIDToken;