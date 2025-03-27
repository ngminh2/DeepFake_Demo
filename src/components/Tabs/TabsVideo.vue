<script lang="ts" setup>
import { useFileSystemAccess } from '@vueuse/core'
import { globalActiveKey } from '~/composables'
import { stopDetection, closeWebSocket } from '~/composables/detect'

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

watch(() => globalActiveKey.value, () => {
  const url = videoUrl.value
  URL.revokeObjectURL(url)
  videoUrl.value = ''
  videoRef.value?.pause()
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
      <AButton @click="open()">
       Upload
      </AButton>
    </ASpace>

    <div class="relative h-full w-full">
      <video :key="videoKey" v-show="videoUrl" ref="videoRef" class="h-full w-full" :src="videoUrl" controls autoplay @play="onVideoPlayDetect" />
      <canvas ref="canvasRef" class="absolute top-0 w-full h-full pointer-events-none" :width="inputShape[1]" :height="inputShape[2]" />
    </div>
  </div>
</template>
