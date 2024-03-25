// 切片大小
export const CHUNK_SIZE = 1024 * 256; // 256KB

// 加入的用户
export type Member = { id: string; device: DEVICE_TYPE };
// socket连接状态
export enum CONNECTION_STATE {
  "READY",
  "CONNECTING",
  "CONNECTED",
}
// 平台
export enum DEVICE_TYPE {
  "MOBILE",
  "PC",
}

// 切片类型
export type ChunkType = Blob | ArrayBuffer;
// 文件类型
type FileType = { id: string; size: number; total: number };

// 传输的信息切片
export type SocketMessageType =
  | { type: "text"; data: string }
  | ({ type: "file-start"; name: string } & FileType)
  | ({ type: "file-next"; current: number } & FileType)
  | ({ type: "file-chunk"; current: number; chunk: string } & FileType)
  | { type: "file-finish"; id: string };

// 传输的信息
export type TransferListItem =
  | { type: "text"; data: string; from: "self" | "peer" }
  | {
      type: "file";
      size: number;
      name: string;
      progress: number;
      id: string;
      from: "self" | "peer";
    };
