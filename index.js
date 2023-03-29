const Server = require("./src/server");

// Server.boot();
Server.boot(process.env.APP_PORT ?? 3000);