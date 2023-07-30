
const VideoServer = require("./Server/videoServer")
const config = require("./config")

const vs = new VideoServer(config.videoServer)

vs.start()