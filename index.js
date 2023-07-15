const express = require('express');
const http = require('http');
const log4js = require('log4js');
const socketIO = require('socket.io');

log4js.configure({
    appenders: { console: { type: 'console'} },
    categories: { default: { appenders: ["console"], level: "TRACE" } }
});
const logger = log4js.getLogger('sigsrv');

if (process.argv.length != 3) {
    logger.error(`Usage: node ./index.js <port>`);
    process.exit(1);
}
const port = parseInt(process.argv[2], 10);

const app = express();
const http_srv = http.createServer(app);
const io = socketIO(http_srv);

io.on('connection', (socket) => {
    logger.debug('user connected');

    socket.on('join', (room) => {
        logger.debug(`user join room ${room}`);
    });

    socket.on('leave', (room) => {
        logger.debug(`user leave room ${room}`);
    });

    socket.on('sdp', (room, data) => {
        logger.debug(`user sdp: room=${room}, data=${data}`);
    });

    socket.on('disconnect', () => {
        logger.debug('user disconnected');
    });
});

http_srv.listen(port, () => {
    logger.info(`listening on *:${port}`);
});

logger.info('All Done!');
