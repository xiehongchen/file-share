<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { CONNECTION_STATE, Member } from "../types/client.ts"
import { CLINT_EVENT, SERVER_EVENT, ServerFn } from "../types/websocket.ts"
import { SHAKE_HANDS } from "../types/server.ts";
import { SocketClient } from "./utils/socket"
const client = ref<SocketClient | any | null>(null)
const id = ref('')
const peerId = ref('')
const visible = ref(false)
const members = ref<Member[]>([])
const state = ref(CONNECTION_STATE.READY)


// 加入房间
const onJoinRoom: ServerFn<typeof SERVER_EVENT.JOINED_ROOM> = (data) => {
  console.log('onJoinRoom', data)
  members.value.push(data)
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
  console.log('onReceiveRequest', event)
  const { origin } = event
  if (!peerId.value && !visible.value) {
    peerId.value = origin
    visible.value = true
    state.value = CONNECTION_STATE.CONNECTED
    client.value?.current?.emit(CLINT_EVENT.SEND_RESPONSE, {
      target: origin,
      origin: id.value,
      code: SHAKE_HANDS.ACCEPT
    })
  } else {
    client.value?.current?.emit(CLINT_EVENT.SEND_RESPONSE, {
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

// const onPeerConnection = (member: Member) => {
//   if (client.value.current) {
//     client.value.current.emit(CLINT_EVENT.SEND_REQUEST, {
//       target: member.id,
//       origin: id.value
//     }, (state: any) => {
//       if (state.code !== ERROR_TYPE.NO_ERROR && state.message) {
//         ElMessage.error(state.message)
//       }
//     })
//     visible.value = true
//     peerId.value = member.id
//     state.value = CONNECTION_STATE.CONNECTING
//   }
// }
// 初始化
onMounted(() => {
  client.value = new SocketClient(location.host)
  client.value.on(SERVER_EVENT.JOINED_ROOM, onJoinRoom);
  client.value.on(SERVER_EVENT.JOINED_MEMBER, onJoinedMember);
  client.value.on(SERVER_EVENT.LEFT_ROOM, onLeftRoom);
  client.value.on(SERVER_EVENT.FORWARD_REQUEST, onReceiveRequest);
  client.value.on(SERVER_EVENT.FORWARD_RESPONSE, onReceiveResponse);
  client.value.on(SERVER_EVENT.FORWARD_UNPEER, onUnpeer);

  id.value = client.value.id
})
onUnmounted(() => {
  client.value.off(SERVER_EVENT.JOINED_ROOM, onJoinRoom);
  client.value.off(SERVER_EVENT.JOINED_MEMBER, onJoinedMember);
  client.value.off(SERVER_EVENT.LEFT_ROOM, onLeftRoom);
  client.value.off(SERVER_EVENT.FORWARD_REQUEST, onReceiveRequest);
  client.value.off(SERVER_EVENT.FORWARD_RESPONSE, onReceiveResponse);
  client.value.off(SERVER_EVENT.FORWARD_UNPEER, onUnpeer);
})
</script>

<template>
  <div></div>
</template>

<style scoped lang="scss"></style>
