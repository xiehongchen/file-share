import type { DEVICE_TYPE, SocketMessageType } from "./client";
import type { ERROR_TYPE, SHAKE_HANDS } from "./server";
// 客户端基础方法
const CLINT_EVENT_BASE = [
  "JOIN_ROOM",
  "LEAVE_ROOM",
  "SEND_REQUEST",
  "SEND_RESPONSE",
  "SEND_UNPEER",
  "SEND_MESSAGE",
] as const;
// 客户端方法key
export type ClientEventKeys = typeof CLINT_EVENT_BASE[number];
export const CLINT_EVENT = CLINT_EVENT_BASE.reduce(
  (acc, cur) => ({ ...acc, [cur]: cur }),
  {} as { [K in ClientEventKeys]: K }
);
/**
{
  JOIN_ROOM: "JOIN_ROOM",
  LEAVE_ROOM: "LEAVE_ROOM",
  SEND_REQUEST: "SEND_REQUEST",
  SEND_RESPONSE: "SEND_RESPONSE",
  SEND_UNPEER: "SEND_UNPEER",
  SEND_MESSAGE: "SEND_MESSAGE"
}
 */
// 服务端基础方法
const SERVER_EVENT_BASE = [
  "JOINED_ROOM",
  "JOINED_MEMBER",
  "LEFT_ROOM",
  "FORWARD_REQUEST",
  "FORWARD_RESPONSE",
  "FORWARD_UNPEER",
  "FORWARD_MESSAGE",
] as const;
// 服务端方法key
export type ServerEventKeys = typeof SERVER_EVENT_BASE[number];
export const SERVER_EVENT = SERVER_EVENT_BASE.reduce(
  (acc, cur) => ({ ...acc, [cur]: cur }),
  {} as { [K in ServerEventKeys]: K }
);
/**
{
  JOINED_ROOM: "JOINED_ROOM",
  JOINED_MEMBER: "JOINED_MEMBER",
  LEFT_ROOM: "LEFT_ROOM",
  FORWARD_REQUEST: "FORWARD_REQUEST",
  FORWARD_RESPONSE: "FORWARD_RESPONSE",
  FORWARD_UNPEER: "FORWARD_UNPEER",
  FORWARD_MESSAGE: "FORWARD_MESSAGE"
}
 */
export interface SocketEventParams {
  // CLIENT
  [CLINT_EVENT.JOIN_ROOM]: {
    id: string;
    device: DEVICE_TYPE;
  };
  [CLINT_EVENT.LEAVE_ROOM]: {
    id: string;
  };
  [CLINT_EVENT.SEND_REQUEST]: {
    origin: string;
    target: string;
  };
  [CLINT_EVENT.SEND_RESPONSE]: {
    origin: string;
    target: string;
    code: SHAKE_HANDS;
    reason?: string;
  };
  [CLINT_EVENT.SEND_UNPEER]: {
    origin: string;
    target: string;
  };
  [CLINT_EVENT.SEND_MESSAGE]: {
    origin: string;
    target: string;
    message: SocketMessageType;
  };

  // SERVER
  [SERVER_EVENT.JOINED_ROOM]: {
    id: string;
    device: DEVICE_TYPE;
  };
  [SERVER_EVENT.JOINED_MEMBER]: {
    initialization: {
      id: string;
      device: DEVICE_TYPE;
    }[];
  };
  [SERVER_EVENT.LEFT_ROOM]: {
    id: string;
  };
  [SERVER_EVENT.FORWARD_REQUEST]: {
    origin: string;
    target: string;
  };
  [SERVER_EVENT.FORWARD_RESPONSE]: {
    origin: string;
    target: string;
    code: SHAKE_HANDS;
    reason?: string;
  };
  [SERVER_EVENT.FORWARD_UNPEER]: {
    origin: string;
    target: string;
  };
  [SERVER_EVENT.FORWARD_MESSAGE]: {
    origin: string;
    target: string;
    message: SocketMessageType;
  };
}
// state回调函数
export type CallBackState = { code: ERROR_TYPE; message: string };
// 客户端函数
export type ClientFn<T extends ClientEventKeys> = (
  payload: SocketEventParams[T],
  callback?: (state: CallBackState) => void
) => void;
// 客户端处理方法
export type ClientHandler = { [K in ClientEventKeys]: ClientFn<K> };
export type ServerFn<T extends ServerEventKeys> = (
  payload: SocketEventParams[T],
  callback?: (state: CallBackState) => void
) => void;
export type ServerHandler = { [K in ServerEventKeys]: ServerFn<K> };
