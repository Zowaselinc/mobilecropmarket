
var appRoot = require("app-root-path");
const md5 = require("md5");
const fs = require('fs');
var FormData = require('form-data');
const axios = require('axios');


class FileService {

    static async uploadFile(file) {
        let extension = file.mimetype.split("/")[1];
        let newName =
            md5(file.name + new Date().toDateString()) + `.${extension}`;
        let path = `${appRoot}/public/temp`;
        if (!fs.existsSync(path)) {
            fs.mkdirSync(path);
        }
        let sampleFile = file;
        let filePath = `${path}/${newName}`;
        return new Promise((resolve, reject) => {
            sampleFile.mv(filePath, async function (err) {
                const file = fs.createReadStream(filePath);
                const form = new FormData();
                form.append("image", file)
                const response = await axios.post('https://filesapi.growsel.com/upload.php', form);
                fs.unlink(filePath, function (err) { })
                var uploaded = response.data.data.imageLink;
                resolve(uploaded);
            });
        });
    }

}

module.exports = FileService;