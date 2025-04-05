<script lang="ts" setup>
import { globalActiveKey } from '~/composables'
import { defineProps } from 'vue'
import { stopDetection, closeWebSocket } from '~/composables/detect'

const pingRef = ref(500)
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
  clearCanvas()
  videoKey.value++
  resetVideo()
})
watch(enabled, (newVal) => {
  if (!newVal) {
    stopDetection()
    closeWebSocket()
  }
})
onMounted(() => {
  document.addEventListener("visibilitychange", handleVisibilityChange);
});

onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", handleVisibilityChange);
});

function handleVisibilityChange() {
  if (document.hidden) {
    resetVideo();
  }
}

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
    detectFASonVideo(videoRef.value, canvasRef.value, pingRef, props.parameters)
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

    
    <div v-if="props.model === 'DeepFake Segmentation'">
      <div v-show="enabled" class="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full w-full">
        <div class="relative flex justify-center items-center h-full w-full">
          <div class="absolute top-0 left-0 bg-red-500 text-white font-bold p-2 sm:p-3 lg:p-4 flex items-center">
            <svg class="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
              viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M8.5 16.5a3.5 3.5 0 017 0M5.07 12.93a8.5 8.5 0 0113.86 0M1.5 9a13 13 0 0121 0" />
            </svg>
            <span class="ml-1 text-base sm:text-lg lg:text-xl">{{ pingRef }}ms</span>
          </div>
          <canvas ref="canvasRef" class="w-full h-full" :width="inputShape[1]" :height="inputShape[2]" />
        </div>
        <div class="flex justify-center items-center h-full w-full">
          <video :key="videoKey" ref="videoRef" class="h-full w-full" controls autoplay @play="onVideoPlayDetect" />
        </div>
      </div>
    </div>

    <div v-else>
      <div v-show="enabled" class="relative h-full w-full">
        <div class="absolute top-0 left-0 bg-red-500 text-white font-bold p-2 sm:p-3 lg:p-4 flex items-center">
          <svg class="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8.5 16.5a3.5 3.5 0 017 0M5.07 12.93a8.5 8.5 0 0113.86 0M1.5 9a13 13 0 0121 0" />
          </svg>
          <span class="ml-1 text-base sm:text-lg lg:text-xl">{{ pingRef }}ms</span>
        </div>
        <video :key="videoKey" ref="videoRef" class="h-full w-full" controls autoplay @play="onVideoPlayDetect" />
        <canvas ref="canvasRef" class="absolute top-0 w-full h-full pointer-events-none" :width="inputShape[1]"
          :height="inputShape[2]" />
      </div>
    </div>
  </div>
</template>
