const express = require('express');
const path = require('path');
const app = express();

class StaticServer {
    constructor(config) {
        this.config = config
    }
    start() {
        app.use(express.static(path.join(__dirname,"../" , 'public')));
        // Start the server
        app.listen(this.config.port, () => {
            console.log(`Static server running on http://localhost:${this.config.port}`);
        });
    }
}

module.exports = StaticServer