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
  logger.error('Usage: node ./index.js <port>');
  process.exit(1);
}
const port = parseInt(process.argv[2], 10);

const app = express();
const http_srv = http.createServer(app);
const io = socketIo(http_srv);

io.on('connection', (socket) => {
  logger.debug(`user ${socket.id} connected`);

  socket.on('join', (msg, ack) => {
    try {
      logger.debug(`user ${socket.id} join: msg=${JSON.stringify(msg)}`);
      if (!msg || !msg.room) {
        ack({ code: 400, message: 'malformed message' });
        throw new Error('malformed message');
      }
      let roomId = msg.room;
      let myRoom = io.sockets.adapter.rooms.get(roomId);
      let usrCnt = myRoom ? myRoom.size : 0;
      logger.debug(`room ${roomId}: usrCnt=${usrCnt}`);
      if (usrCnt >= 2) {
        ack({ code: 500, message: 'room is full' });
        throw new Error('room is full');
      }
      socket.join(roomId);
      ack({ code: 200, userNum: (usrCnt + 1) });
      socket.to(roomId).emit('join_notify', socket.id);
    } catch (err) {
      logger.error(`Fail to process join request: ${err}`);
    }
  });

  socket.on('leave', (msg, ack) => {
    try {
      logger.debug(`user ${socket.id} leave: msg=${JSON.stringify(msg)}`);
      if (!msg || !msg.room) {
        ack({ code: 400, message: 'malformed message' });
        throw new Error('malformed message');
      }
      let roomId = msg.room;
      let myRoom = io.sockets.adapter.rooms.get(roomId);
      let usrCnt = myRoom ? myRoom.size : 0;
      logger.debug(`room ${roomId}: usrCnt=${usrCnt}`);
      if (usrCnt <= 0) {
        ack({ code: 500, message: 'room is empty' });
        throw new Error('room is empty');
      }
      socket.leave(roomId);
      ack({ code: 200, userNum: (usrCnt - 1) });
      socket.to(roomId).emit('leave_notify', socket.id);
    } catch (err) {
      logger.error(`Fail to process leave request: ${err}`);
    }
  });

  socket.on('message', (msg) => {
    try {
      logger.debug(`user ${socket.id} message: msg=${JSON.stringify(msg)}`);
      if (!msg || !msg.room || !msg.data) {
        throw new Error('malformed message');
      }
      let roomId = msg.room;
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
      logger.debug(`sending leave_notify to rooms: ${JSON.stringify(roomList)}`);
      socket.to(roomList).emit('leave_notify', socket.id);
    } catch (err) {
      logger.error(`Fail to process disconnecting event: ${err}`);
    }
  });
});

http_srv.listen(port, () => {
  logger.info(`listening on *:${port}`);
});

logger.info('ready to play');
