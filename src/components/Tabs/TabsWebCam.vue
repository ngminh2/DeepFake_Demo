<script lang="ts" setup>
import { globalActiveKey } from '~/composables'
import { defineProps } from 'vue'
import { stopDetection, closeWebSocket } from '~/composables/detect'

const videoKey = ref(0)
const props = defineProps<{ model: string, parameters: Record<string, any> }>()
const canvasRef = ref()
const videoRef = ref<HTMLVideoElement>()
const currentCamera = ref<string>()
const { videoInputs: cameras } = useDevicesList({
  requestPermissions: true,
  onUpdated() {
    if (!cameras.value.find(i => i.deviceId === currentCamera.value))
      currentCamera.value = cameras.value[0]?.deviceId
  },
})

const { stream, enabled } = useUserMedia({
  constraints: { video: { deviceId: currentCamera } },
})
watchEffect(() => {
  if (videoRef.value)
    videoRef.value.srcObject = stream.value!
})
watch(() => globalActiveKey.value, () => {
  videoRef.value?.pause()
})

function clearCanvas() {
  if (canvasRef.value) {
    const ctx = canvasRef.value.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
    }
  }
}

function resetVideo() {
  if (videoRef.value) {
    videoRef.value.srcObject = null
    videoRef.value.load()
    videoRef.value = undefined
  }
  if (canvasRef.value) {
    canvasRef.value = null
  }
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop())
  }
  enabled.value = false
  stopDetection()
  closeWebSocket()
}

watch(() => props.model, () => {
  clearCanvas()
  videoKey.value++
  if (videoRef.value) {
    resetVideo()
  }
})

function onVideoPlayDetect() {
  if (props.model === 'Deep Face Anti-Spoofing') {
    detectFASonVideo(videoRef.value, canvasRef.value, props.parameters)
  } else if (props.model === 'DeepFake Segmentation') {
    // detect2(videoRef.value, canvasRef.value);
  }
}
</script>

<template>
  <div class="flex flex-col justify-start">
    <ASpace class="mb-10px">
      <AButton @click="enabled = !enabled">
        {{ enabled ? 'Stop' : 'Start' }}
      </AButton>
    </ASpace>
    <div>
      <div v-for="camera of cameras" :key="camera.deviceId" class="cursor-pointer px-2 py-1"
        :class="{ 'text-blue-6': currentCamera === camera.deviceId }" @click="currentCamera = camera.deviceId">
        {{ camera.label }}
      </div>
    </div>
    <div v-show="enabled" class="relative h-full w-full">
      <video :key="videoKey" ref="videoRef" class="h-full w-full" controls autoplay @play="onVideoPlayDetect" />
      <canvas ref="canvasRef" class="pointer-events-none absolute top-0 h-full w-full" :width="inputShape[1]"
        :height="inputShape[2]" />
    </div>
  </div>
</template>
