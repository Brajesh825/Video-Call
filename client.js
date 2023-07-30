
const StaticServer = require("./Server/staticServer")
const config = require("./config")

const ss = new StaticServer(config.staticServer)

ss.start()