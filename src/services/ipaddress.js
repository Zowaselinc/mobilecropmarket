const os = require('os');

class UserIPAddress {
    
    static async getIPAddress(){
        const interfaces = os.networkInterfaces();
        for (const interfaceName in interfaces) {
            const interfacee = interfaces[interfaceName];

            for (const network of interfacee) {
                if (network.family === 'IPv4' && !network.internal) {
                    console.log("ipAddresses", network.address);
                    return network.address;
                }   
            }
        }
        return null;
    }
}

module.exports = UserIPAddress;