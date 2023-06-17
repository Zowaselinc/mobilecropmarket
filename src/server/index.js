
const express = require('express');

const App = express();



/* ---------------------------------------------------- STEP ONE ---------------------------------------------------- */
/* ------------- CREATE A SEPARATE NODE HTTP SERVER DIFFERENT FROM EXPRESS AND ATTACH App aboce into it ------------- */
const http = require ('http',{
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }

}).Server(App)

/* ---------------------------------------------------- STEP TWO ---------------------------------------------------- */
/* ------------------------------------- INSTALL SOCKET IO NPM   npm i socket.io ------------------------------------ */


/* --------------------------------------------------- STEP THREE --------------------------------------------------- */
/* -------------------------------------------- CREATE SOCKET IO INSTANCE ------------------------------------------- */


const Routes = require('../routes');

const {DB} = require("~database/models");

const cors = require('cors');
const GlobalUtils = require('~utilities/global');


/* --------------------------------------------- ESTABLISH IO ON SOCKETS -------------------------------------------- */
const io  = require('socket.io')(http, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
    
});


/* --------------------------------------- SEND IO OBJECT TO ANOTHER SERVICES --------------------------------------- */
const MeshSockets = require('~services/sockets');
const { Socket } = require('socket.io');
MeshSockets(io);


class Server{

    static boot(port=3000){

        App.use(cors({
            origin: '*',
            methods: ['GET','POST','OPTIONS','PUT','DELETE','PATCH']
        }));

        // Register App Routes
        Routes(App).register();
    

        //Sync Database Models
        //{ force: true }
        DB.sequelize.sync({ })
        .then(() => {
            console.log("Synced db.");
        })
        .catch((err) => {
            console.log("Failed to sync db: " + err.message);
        });

        /* ------------- I commented app.listen out because of Socket.io ------------ */
        // App.listen(port, () => {
        //     console.log(`Example app listening on port ${port}`)
        // })
        http.listen(port, () => {
            console.log(`Admin app listening on port ${port}`)
        })
    }
    
}

module.exports = Server;
