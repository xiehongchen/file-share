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
} from "../types/websocket";
import { CONNECTION_STATE, ERROR_TYPE, Member, ServerSocket } from "../types/server";

const app = express()
app.use(express.static("build/static"))
const httpServer = http.createServer(app)
const io = new Server<ClientHandler, ServerHandler>(httpServer)

const authenticate = new WeakMap<ServerSocket, string>();
const room = new Map<string, Member>();
const peer = new Map<string, string>();

io.on("connection", socket => {
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
  socket.on(CLINT_EVENT.SEND_MESSAGE, () => {
  })
})


