<template>
  <el-dialog v-model="visible" width="500" class="modal" ref="modalRef" @close="onCancel"
  :close-on-click-modal="false" :close-on-press-escape="false">
    <template #header>
      <div class="title">
        <div class="dot" :style="{
          backgroundColor:
            state === CONNECTION_STATE.READY
              ? 'red'
              : state === CONNECTION_STATE.CONNECTING
                ? 'orage'
                : state === CONNECTION_STATE.CONNECTED
                  ? 'green'
                  : 'gray'
        }"></div>
        {{ state === CONNECTION_STATE.READY
          ? '已断开' + peerId
          : state === CONNECTION_STATE.CONNECTING
            ? '连接中' + peerId
            : state === CONNECTION_STATE.CONNECTED
              ? '已连接' + peerId
              : '未知状态' + peerId }}
      </div>
    </template>
    <div class="modalContent" ref="listRef">
      <div v-for="item, index in list" :key="index" class="messageItem" 
        :class="{'alignRight' : item.from === 'self' }">
        <div class="messageContent">
          <div v-if="item.type === 'text'">{{ item.data }}</div>
          <div v-else class="fileMessage">
            <div class="fileInfo">
              <div>
                <div class="fileName">{{ item.name }}</div>
                <div>{{ formatBytes(item.size) }}</div>
              </div>
              <div :class="item.progress !== 100 ? 'fileDownload' : ''" @click="downloadFile(item.id, item.name)">下载</div>
            </div>
            <el-progress :percentage="item.progress" />
          </div>
        </div>
      </div>
    </div>
    <div class="modalFooter">
      <el-button class="sendFile" @click="sendFile">上传</el-button>
      <el-input v-model="text" placeholder="发送信息"></el-input>
      <el-button class="sendFile" @click="sendText">发送</el-button>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { CONNECTION_STATE, ChunkType, TransferListItem, CHUNK_SIZE, SocketMessageType } from "../../types/client.ts"
import { SocketClient } from "../utils/socket.ts";
import { ElDialog, ElButton, ElProgress, ElInput } from 'element-plus'
import { ref, onUnmounted } from 'vue'
import { base64ToBlob, formatBytes, getChunkByIndex, onScroll } from "../utils/format";
import { CLINT_EVENT, SERVER_EVENT, ServerFn } from "../../types/websocket";
import { nanoid } from "nanoid";
const visible = defineModel('visible', { type: Boolean, default: false })
const id = defineModel('id', { type: String, default: '' })
const peerId = defineModel('peerId', { type: String, default: '' })
const state = defineModel('state', { default: CONNECTION_STATE.READY })
interface propsType {
  client: SocketClient | null
  id: string
}
const props = withDefaults(defineProps<propsType>(), {
  client: null,
})
const listRef = ref<HTMLDivElement | null>(null)
const fileSource = ref<Record<string, Blob>>({})
const fileMapper = ref<Record<string, ChunkType[]>>({})
const text = ref('')
const list = ref<TransferListItem[]>([])
const modalRef = ref(null)

console.log('props', props)

const onCancel = () => {
  props.client?.emit(CLINT_EVENT.SEND_UNPEER, { target: peerId.value, origin: id.value });
  state.value = CONNECTION_STATE.READY
  visible.value = false
}
const updateFileProgress = (id: string, progress: number, newList = list.value) => {
  const last = newList.find(item => item.type === "file" && item.id === id)
  if (last && last.type === "file") {
    last.progress = progress
    list.value = newList
  }
}
const onMessage: ServerFn<typeof SERVER_EVENT.FORWARD_MESSAGE> = (event) => {
  console.log('onMessage', event)
  if (event.origin !== peerId.value) return void 0
  const data = event.message
  if (data.type === "text") {
    list.value.push({ from: "peer", ...data })
  } else if (data.type === 'file-start') {
    const { id, name, size, total } = data
    fileMapper.value[id] = []
    list.value.push({ type: "file", from: "peer", name, size, progress: 0, id })
    sendMessage({ type: "file-next", id, current: 0, size, total })
  } else if (data.type === 'file-chunk') {
    const { id, current, total, size, chunk } = data;
    const progress = Math.floor((current / total) * 100);
    updateFileProgress(id, progress)
    if (current >= total) {
      sendMessage({ type: "file-finish", id })
    } else {
      const mapper = fileMapper.value
      if (!mapper[id]) mapper[id] = []
      mapper[id][current] = base64ToBlob(chunk)
      sendMessage({ type: "file-next", id, current: current + 1, size, total })
    }
  } else if (data.type === 'file-next') {
    const { id, current, total, size } = data
    const progress = Math.floor((current / total) * 100)
    updateFileProgress(id, progress)
    const file = fileSource.value[id]
    if (file) {
      getChunkByIndex(file, current).then(chunk => {
        sendMessage({ type: "file-chunk", id, current, total, size, chunk });
      })
    }
  } else if (data.type === "file-finish") {
    const { id } = data
    updateFileProgress(id, 100)
  }
  onScroll(listRef.value)
}

props.client?.on(SERVER_EVENT.FORWARD_MESSAGE, onMessage)

onUnmounted(() => {
  props.client?.off(SERVER_EVENT.FORWARD_MESSAGE, onMessage)
})

const sendFile = () => {
  const KEY = "websocket-file-input";
    const exist = document.querySelector(`body > [data-type='${KEY}']`) as HTMLInputElement;
    console.log('exist', exist)
    const input: HTMLInputElement = exist || document.createElement("input");
    input.value = "";
    input.setAttribute("data-type", KEY);
    input.setAttribute("type", "file");
    input.setAttribute("style", 'display: none;');
    input.setAttribute("accept", "*");
    input.setAttribute("multiple", "true");
    !exist && document.body.append(input);
    input.onchange = e => {
      const target = e.target as HTMLInputElement;
      document.body.removeChild(input);
      const files = target.files;
      files && sendFilesBySlice(files);
    };
    input.click();
}
const sendFilesBySlice = async(files: FileList) => {
  const newList = [...list.value]
  for (const file of files) {
    const name = file.name
    const id = nanoid()
    const size = file.size
    const total = Math.ceil(file.size / CHUNK_SIZE)
    sendMessage({ type: "file-start", id, name, size, total })
    fileSource.value[id] = file
    newList.push({ type: "file", from: "self", name, size, progress: 0, id } as const)
  }
  list.value = newList
  onScroll(listRef.value)
}
const sendMessage = (message: SocketMessageType) => {
  props.client?.emit(CLINT_EVENT.SEND_MESSAGE, { target: peerId.value, message, origin: id.value })
}
const sendText = () => {
  sendMessage({ type: "text", data: text.value })
  list.value.push({ type: "text", from: "self", data: text.value })
  text.value = ''
  onScroll(listRef.value)
}


const downloadFile = (id: string, fileName: string) => {
  const blob = fileMapper.value[id] ? 
  new Blob(fileMapper.value[id], { type: "application/octet-stream" }) : 
  fileSource.value[id] || new Blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<style lang="scss" scoped>
.modal {
  box-sizing: border-box;
  max-height: 100%;
  max-width: 96%;

  .title {
    align-items: center;
    display: flex;
    justify-content: center;

    .dot {
      border-radius: 5px;
      height: 7px;
      margin-right: 7px;
      margin-top: 1px;
      width: 7px;
    }
  }

  .modalContent {
    box-sizing: border-box;
    height: 500px;
    overflow-y: auto;
    padding: 5px 10px;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      background-color: transparent;
      height: 0;
      width: 0;
    }

    .messageItem {
      display: flex;

      &.alignRight {
        justify-content: flex-end;
      }
    }

    .messageContent {
      border-radius: 10px;
      box-sizing: border-box;
      margin-top: 20px;
      max-width: 80%;
      padding: 10px;
    }

    .fileMessage {
      max-width: 100%;
      min-width: 160px;
      padding: 0 5px;

      .fileInfo {
        align-items: center;
        display: flex;
        font-size: 12px;
        justify-content: space-between;
      }

      .fileName {
        font-size: 14px;
        margin-bottom: 3px;
        overflow-wrap: break-word;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .fileIcon {
        margin-right: 3px;
      }

      .fileDownload {
        align-items: center;
        border: 1px solid #fff;
        border-radius: 20px;
        color: #fff;
        cursor: pointer;
        display: flex;
        flex-shrink: 0;
        font-size: 16px;
        height: 26px;
        justify-content: center;
        margin-left: 20px;
        width: 26px;

        &.disable {
          cursor: not-allowed;
          opacity: 0.5;
        }
      }
    }
  }

  .modalFooter {
    align-items: center;
    display: flex;
    height: 60px;
    padding: 5px 10px;

    .sendFile {
      margin-right: 10px;

      &:focus-visible {
        box-shadow: none;
      }
    }
  }
}
</style>