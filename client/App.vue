<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { CONNECTION_STATE, DEVICE_TYPE, Member } from "../types/client.ts"
import { CLINT_EVENT, SERVER_EVENT, ServerFn } from "../types/websocket.ts"
import { SHAKE_HANDS, ERROR_TYPE } from "../types/server.ts";
import { SocketClient } from "./utils/socket"
// import Model from './components/model.vue'
import ChatBox from './components/chatBox.vue'
import { ElMessage } from 'element-plus'
const client = ref<SocketClient | null>(null)
const id = ref('')
const peerId = ref('')
const visible = ref(false)
const members = ref<Member[]>([])
const state = ref(CONNECTION_STATE.READY)


// 加入房间
const onJoinRoom: ServerFn<typeof SERVER_EVENT.JOINED_ROOM> = (data) => {
  members.value.push(data)
  console.log('onJoinRoom', data)
  console.log('onJoinRoom', members.value)
}
// 加入房间的成员
const onJoinedMember: ServerFn<typeof SERVER_EVENT.JOINED_MEMBER> = (event) => {
  const { initialization } = event
  members.value.push(...initialization)
}
// 离开房间
const onLeftRoom: ServerFn<typeof SERVER_EVENT.LEFT_ROOM> = (event) => {
  const { id } = event
  console.log('onLeftRoom', id)
  if (id === peerId.value) {
    visible.value = false
    peerId.value = ''
  }
  members.value = members.value.filter((item) => item.id !== id)
}
// 接收到请求
const onReceiveRequest: ServerFn<typeof SERVER_EVENT.FORWARD_REQUEST> = (event) => {
  console.log("接收请求", event);
  const { origin } = event
  if (!peerId.value && !visible.value) {
    peerId.value = origin
    visible.value = true
    state.value = CONNECTION_STATE.CONNECTED
    client.value?.emit(CLINT_EVENT.SEND_RESPONSE, {
      target: origin,
      origin: id.value,
      code: SHAKE_HANDS.ACCEPT
    })
  } else {
    client.value?.emit(CLINT_EVENT.SEND_RESPONSE, {
      target: origin,
      origin: id.value,
      code: SHAKE_HANDS.REJECT,
      reason: `The Device ${id.value} is busy`
    })
  }
}
// 接受到响应
const onReceiveResponse: ServerFn<typeof SERVER_EVENT.FORWARD_RESPONSE> = (event) => {
  console.log('onReceiveResponse', event)
  const { code, reason } = event
  if (code === SHAKE_HANDS.ACCEPT) {
    state.value = CONNECTION_STATE.CONNECTED
  } else {
    state.value = CONNECTION_STATE.READY
    console.log('reason', reason)
  }
}
const onUnpeer: ServerFn<typeof SERVER_EVENT.FORWARD_UNPEER> = (event) => {
  console.log('onUnpeer', event)
  if (event.target === id.value && event.origin === peerId.value) {
    visible.value = false
    peerId.value = ''
    state.value = CONNECTION_STATE.READY
  }
}
// 发起连接
const onPeerConnection = (member: Member) => {
  if (client.value) {
    // 向一个用户发起请求连接
    client.value.emit(CLINT_EVENT.SEND_REQUEST, {
      target: member.id,
      origin: id.value
    }, (state: any) => {
      if (state.code !== ERROR_TYPE.NO_ERROR && state.message) {
        ElMessage.error(state.message);

      }
    })
    visible.value = true
    peerId.value = member.id
    state.value = CONNECTION_STATE.CONNECTING
  }
}
// 初始化
const init = () => {
  client.value = new SocketClient(location.host)
  console.log('client.value', client.value)
  client.value.on(SERVER_EVENT.JOINED_ROOM, onJoinRoom);
  client.value.on(SERVER_EVENT.JOINED_MEMBER, onJoinedMember);
  client.value.on(SERVER_EVENT.LEFT_ROOM, onLeftRoom);
  client.value.on(SERVER_EVENT.FORWARD_REQUEST, onReceiveRequest);
  client.value.on(SERVER_EVENT.FORWARD_RESPONSE, onReceiveResponse);
  client.value.on(SERVER_EVENT.FORWARD_UNPEER, onUnpeer);

  id.value = client.value.id
}
init()
onUnmounted(() => {
  client.value?.off(SERVER_EVENT.JOINED_ROOM, onJoinRoom);
  client.value?.off(SERVER_EVENT.JOINED_MEMBER, onJoinedMember);
  client.value?.off(SERVER_EVENT.LEFT_ROOM, onLeftRoom);
  client.value?.off(SERVER_EVENT.FORWARD_REQUEST, onReceiveRequest);
  client.value?.off(SERVER_EVENT.FORWARD_RESPONSE, onReceiveResponse);
  client.value?.off(SERVER_EVENT.FORWARD_UNPEER, onUnpeer);
})
</script>

<template>
  <div class="container">
    <div class="deviceGroup">
      <div class="current">
        <div>当前用户</div>
        <div>{{ id }}</div>
      </div>
      <div v-for="item in members" :key="item.id" class="device" @click="onPeerConnection(item)">
        <div class="icon">
          {{ DEVICE_TYPE.MOBILE ? '手机' : '电脑' }}
        </div>
        <div class="name">{{ item.id.slice(0, 7) }}</div>
      </div>
    </div>
    <chat-box v-model:visible="visible" :client="(client as SocketClient)" v-model:state="state" v-model:id="id" v-model:peerId="peerId"></chat-box>
    <!-- <Model v-model:visible="visible" :client="(client as SocketClient)" v-model:state="state" v-model:id="id" v-model:peerId="peerId" /> -->
  </div>
</template>

<style scoped lang="scss">
.container {
  display: flex;
  height: 100vh;
  overflow: hidden;
  width: 100%;

  .deviceGroup {
    display: flex;
    font-size: 14px;
    padding: 10px;
    border-right: 1px solid #eee;
    flex-direction: column;

    .current {
      margin-bottom: 20px;
    }

    .device {
      align-items: center;
      animation-duration: 0.5s;
      animation-fill-mode: forwards;
      animation-name: scale-in;
      transition: transform 0.3s ease;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      flex-wrap: wrap;
      background-color: rgb(93, 155, 231);
      padding: 10px;
      margin-bottom: 10px;

      &:hover {
        transform: scale(1.1);
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
      }

      .name {
        color: var(--color-text-1);
        margin-top: 6px;
      }
    }
  }
}

@keyframes scale-in {
  0% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}
</style>
<style>
body, html {
  margin: 0;
  padding: 0;
}
</style>