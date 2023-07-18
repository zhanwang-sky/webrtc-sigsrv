const express = require('express');
const http = require('http');
const log4js = require('log4js');
const socketIo = require('socket.io');

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
const io = socketIo(http_srv);

io.on('connection', (socket) => {
  logger.debug(`user ${socket.id} connected`);

  socket.on('join', (roomId, ack) => {
    try {
      logger.debug(`user ${socket.id} joins room ${roomId}`);
      let myRoom = io.sockets.adapter.rooms.get(roomId);
      let usrCnt = myRoom ? myRoom.size : 0;
      logger.debug(`room ${roomId}: usrCnt=${usrCnt}`);
      if (usrCnt >= 2) {
        ack('full');
        throw new Error('room is full');
      }
      socket.join(roomId);
      ack(usrCnt + 1);
      socket.to(roomId).emit('join_notify', socket.id);
    } catch (err) {
      logger.error(`Fail to process join request: ${err}`);
    }
  });

  socket.on('leave', (roomId, ack) => {
    try {
      logger.debug(`user ${socket.id} leaves room ${roomId}`);
      let myRoom = io.sockets.adapter.rooms.get(roomId);
      let usrCnt = myRoom ? myRoom.size : 0;
      logger.debug(`room ${roomId}: usrCnt=${usrCnt}`);
      if (usrCnt <= 0) {
        ack('empty');
        throw new Error('room is empty');
      }
      socket.leave(roomId);
      ack(usrCnt - 1);
      socket.to(roomId).emit('leave_notify', socket.id);
    } catch (err) {
      logger.error(`Fail to process leave request: ${err}`);
    }
  });

  socket.on('message', (roomId, msg) => {
    try {
      logger.debug(`user ${socket.id} sent message to room ${roomId}: ${msg}`);
      socket.to(roomId).emit('message', msg);
    } catch (err) {
      logger.error(`Fail to process message request: ${err}`);
    }
  });

  // hasn't left its rooms yet.
  socket.on('disconnecting', () => {
    try {
      logger.debug(`user ${socket.id} disconnecting...`);
      let roomList = Array.from(socket.rooms);
      logger.debug('sending leave_notify to rooms:', roomList);
      socket.to(roomList).emit('leave_notify', socket.id);
    } catch (err) {
      logger.error(`Fail to process disconnecting event: ${err}`);
    }
  });
});

http_srv.listen(port, () => {
  logger.info(`listening on *:${port}`);
});

logger.info('All Done!');
