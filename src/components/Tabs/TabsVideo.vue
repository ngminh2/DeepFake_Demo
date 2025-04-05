<script lang="ts" setup>
import { useFileSystemAccess } from '@vueuse/core'
import { globalActiveKey } from '~/composables'
import { stopDetection, closeWebSocket } from '~/composables/detect'

const pingRef = ref(500)
const videoKey = ref(0)
const props = defineProps<{ model: string, parameters: Record<string, any> }>()
const canvasRef = ref()
const videoRef = ref<HTMLVideoElement>()
const dataType = ref('Blob') as Ref<'Text' | 'ArrayBuffer' | 'Blob'>
const videoUrl = ref('')

const { isSupported, file, open } = useFileSystemAccess({
  dataType,
  types: [{
    description: 'Video files',
    accept: {
      'video/*': ['.mp4', '.webm', '.mkv', '.avi', '.mov'],
    },
  }],
  excludeAcceptAllOption: true,
})

watch(() => file.value, () => {
  if (file.value)
    videoUrl.value = URL.createObjectURL(file.value)
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
  if (videoUrl.value) {
    URL.revokeObjectURL(videoUrl.value)
    videoUrl.value = ''
  }
  if (videoRef.value) {
    videoRef.value.src = ''
    videoRef.value.load()
    videoRef.value = undefined
  }
  if (canvasRef.value) {
    canvasRef.value = null
  }
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

onMounted(() => {
  if (!isSupported.value)
    alert('Web File System Access API !')
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
watch(() => globalActiveKey.value, () => {
  const url = videoUrl.value
  URL.revokeObjectURL(url)
  videoUrl.value = ''
  videoRef.value?.pause()
})
function onVideoPlayDetect() {
  if (props.model === 'Deep Face Anti-Spoofing') {
    detectFASonVideo(videoRef.value, canvasRef.value, pingRef, props.parameters)
  } else if (props.model === 'DeepFake Segmentation') {
    detectDFonVideo(videoRef.value, canvasRef.value, pingRef, props.parameters)
  }
}
</script>

<template>
  <div class="flex flex-col justify-start">
    <ASpace class="mb-10px">
      <AButton @click="open()">
        Upload
      </AButton>
    </ASpace>

    <div v-if="props.model === 'DeepFake Segmentation'">
      <div v-show="videoUrl" class="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full w-full">
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
          <video :key="videoKey" v-show="videoUrl" ref="videoRef" class="h-full w-full" :src="videoUrl" controls
            autoplay @play="onVideoPlayDetect" />
        </div>
      </div>
    </div>

    <div v-else>
      <div v-show="videoUrl" class="relative h-full w-full">
        <div class="absolute top-0 left-0 bg-red-500 text-white font-bold p-2 sm:p-3 lg:p-4 flex items-center">
          <svg class="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8.5 16.5a3.5 3.5 0 017 0M5.07 12.93a8.5 8.5 0 0113.86 0M1.5 9a13 13 0 0121 0" />
          </svg>
          <span class="ml-1 text-base sm:text-lg lg:text-xl">{{ pingRef }}ms</span>
        </div>
        <video :key="videoKey" v-show="videoUrl" ref="videoRef" class="h-full w-full" :src="videoUrl" controls autoplay
          @play="onVideoPlayDetect" />
        <canvas ref="canvasRef" class="absolute top-0 w-full h-full pointer-events-none" :width="inputShape[1]"
          :height="inputShape[2]" />
      </div>
    </div>
  </div>
</template>
