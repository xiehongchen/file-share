import { Socket } from "socket.io";
import { ClientHandler, ServerHandler } from "./websocket";
import { DEVICE_TYPE } from "./client";

// 服务器socket
export type ServerSocket = Socket<ClientHandler, ServerHandler>;
// 连接状态
export enum CONNECTION_STATE {
  "READY",
  "CONNECTING",
  "CONNECTED",
}
// 握手 连接接受和拒绝
export enum SHAKE_HANDS {
  "ACCEPT",
  "REJECT",
}
// 错误类型
export enum ERROR_TYPE {
  "NO_ERROR",
  "PEER_BUSY",
  "PEER_NOT_FOUND",
}
// 用户信息
export type Member = {
  socket: ServerSocket;
  device: DEVICE_TYPE;
  state: CONNECTION_STATE;
};
