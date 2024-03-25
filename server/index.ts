import http from 'http'
import express from 'express'
import process from "process"
import { Server } from "socket.io"
import {
  CLINT_EVENT,
  SERVER_EVENT,
  ServerHandler,
  ClientHandler,
  SocketEventParams,
} from "../types/websocket.ts";
import { CONNECTION_STATE, ERROR_TYPE, Member, ServerSocket } from "../types/server.ts";
import { getLocalIp, updateMember } from "./utils";

const app = express()
app.use(express.static("dist/assets"))
const httpServer = http.createServer(app)
const io = new Server<ClientHandler, ServerHandler>(httpServer)

const authenticate = new WeakMap<ServerSocket, string>();
const room = new Map<string, Member>();
const peer = new Map<string, string>();

io.on("connection", socket => {
  // 加入房间
  socket.on(CLINT_EVENT.JOIN_ROOM, ({ id, device }) => {
    if (!id) return void 0
    authenticate.set(socket, id)
    // 房间通知消息
    const initialization: SocketEventParams['JOINED_MEMBER']['initialization'] = []
    room.forEach((instance, key) => {
      initialization.push({id: key, device: instance.device})        
      instance.socket.emit(SERVER_EVENT.JOINED_ROOM, { id, device })
    })
    // 加入房间
    room.set(id, { socket, device, state: CONNECTION_STATE.READY })
    socket.emit(SERVER_EVENT.JOINED_MEMBER, { initialization })
  })
  // 发起请求连接
  socket.on(CLINT_EVENT.SEND_REQUEST, ({ origin, target }, cb) => {
    // 如果不存在发起连接的用户
    if (authenticate.get(socket) !== origin) return void 0
    // 获取用户
    const member = room.get(target)
    if (member) {
      // 如果目标用户还未建立连接
      if (member.state !== CONNECTION_STATE.READY) {
        cb?.({ code: ERROR_TYPE.PEER_BUSY, message: `Peer ${target} is Busy` })
        return void 0
      }
      // 设置用户的状态为连接中
      updateMember(room, origin, "state", CONNECTION_STATE.CONNECTING)
      // 用户发起
      member?.socket.emit(SERVER_EVENT.FORWARD_REQUEST, { origin, target })
    } else {
      cb?.({ code: ERROR_TYPE.PEER_NOT_FOUND, message: `Peer ${target} Not Found` })
    }
  })
  // 接受请求
  socket.on(CLINT_EVENT.SEND_RESPONSE, ({ origin, code, reason, target }) => {
    if (authenticate.get(socket) !== origin) return void 0
    const targetSocket = room.get(target)?.socket
    if (targetSocket) {
      // 设置两个状态，并再次发起响应
      updateMember(room, target, "state", CONNECTION_STATE.CONNECTED)
      updateMember(room, origin, "state", CONNECTION_STATE.CONNECTED)
      peer.set(origin, target)
      peer.set(target, origin)
      console.log('peer', peer)
      targetSocket.emit(SERVER_EVENT.FORWARD_RESPONSE, { origin, code, reason, target })
    } 
  })
  // 发送信息
  socket.on(CLINT_EVENT.SEND_MESSAGE, ({ origin, message, target }) => {
    if (authenticate.get(socket) !== origin) return void 0
    const targetSocket = room.get(target)?.socket
    if (targetSocket) {
      targetSocket.emit(SERVER_EVENT.FORWARD_MESSAGE, { origin, message, target })
    }
  })
  // 取消对目标的连接
  socket.on(CLINT_EVENT.SEND_UNPEER, ({ origin, target }) => {
    if (authenticate.get(socket) !== origin) return void 0
    peer.delete(origin)
    updateMember(room, origin, "state", CONNECTION_STATE.READY)
    if (peer.get(target) !== origin) return void 0
    const targetSocket = room.get(target)?.socket
    if (targetSocket) {
      updateMember(room, target, "state", CONNECTION_STATE.READY)
      peer.delete(target)
      targetSocket.emit(SERVER_EVENT.FORWARD_UNPEER, { origin, target })
    }
  })
  const onLeaveRoom = () => {
    const id = authenticate.get(socket)
    if (id) {
      const peerId = peer.get(id)
      peer.delete(id)
      if (peerId) {
        peer.delete(peerId)
        updateMember(room, peerId, "state", CONNECTION_STATE.READY)
      }
      room.delete(id)
      room.forEach(instance => {
        instance.socket.emit(SERVER_EVENT.LEFT_ROOM, { id })
      })
    }
  }
  // 离开房间和连接错误
  socket.on(CLINT_EVENT.LEAVE_ROOM, onLeaveRoom)
  socket.on("disconnect", onLeaveRoom)
})

process.on("SIGINT", () => {
  console.info("SIGINT Received, exiting...");
  process.exit(0);
})
process.on("SIGTERM", () => {
  console.info("SIGTERM Received, exiting...");
  process.exit(0);
})

const PORT = Number(process.env.PORT) || 3000
httpServer.listen(PORT, () => {
  const ip = getLocalIp();
  console.log('ip', ip)
  console.log(`Listening on port http://localhost:${PORT} ...`);
  ip.forEach(item => {
    console.log(`Listening on port http://${item}:${PORT} ...`);
  });
});

