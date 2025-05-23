<script lang="ts" setup>
import { useFileSystemAccess } from '@vueuse/core'
import { globalActiveKey } from '~/composables'
import { defineProps } from 'vue'

function getAccuracyColor(real: number, fake: number): string {
  if (real >= fake) return '#22c55e' // Green
  return '#ef4444' // Red
}

const detectionResult = ref<any[]>([])
const pingRef = ref(500)
const props = defineProps<{ model: string, parameters: Record<string, any> }>()
const canvasRef = ref()
const imageRef = ref()
const dataType = ref('Blob') as Ref<'Text' | 'ArrayBuffer' | 'Blob'>
const imageUrl = ref('')

const { isSupported, file, open } = useFileSystemAccess({
  dataType,
  types: [{
    description: 'Image files',
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.bmp'],
    },
  }],
  excludeAcceptAllOption: true,
})

watch(() => file.value, () => {
  if (file.value) {
    imageUrl.value = URL.createObjectURL(file.value)
  }
})

onMounted(() => {
  if (!isSupported.value)
    alert('Web File System Access API not supported!')
})

watch(() => globalActiveKey.value, () => {
  URL.revokeObjectURL(imageUrl.value)
  imageUrl.value = ''
  detectionResult.value = []
})

function onImageLoadDetect() {
  if (!imageUrl.value || !imageRef.value || !canvasRef.value) return
  detectDFace(imageRef.value, canvasRef.value, pingRef, detectionResult, props.parameters)
}

onMounted(() => {
  document.addEventListener("visibilitychange", handleVisibilityChange)
})

onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", handleVisibilityChange)
})

function handleVisibilityChange() {
  if (document.hidden) {
    URL.revokeObjectURL(imageUrl.value)
    imageUrl.value = ''
    detectionResult.value = []
  }
}

watch(() => props.model, () => {
  // Clear object URL and reset image
  URL.revokeObjectURL(imageUrl.value)
  imageUrl.value = ''
  detectionResult.value = []

  // Optionally clear the canvas
  if (canvasRef.value) {
    const ctx = canvasRef.value.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
    }
  }

  // Reset any other model-specific state here (like pingRef, etc.)
  pingRef.value = 500
})
</script>

<template>
  <div class="flex flex-col justify-start">
    <ASpace class="mb-10px">
      <AButton @click="open()">
        Upload
      </AButton>
    </ASpace>

    <div v-if="detectionResult.length" class="mt-6 mb-6 relative">
      <!-- Scrollable Vertical Cards -->
      <div ref="scrollContainerRef" class="flex flex-col overflow-y-auto max-h-[500px] px-2 pt-2 pb-0 border border-gray-600 rounded-lg shadow-md">
        <div v-for="(item, idx) in detectionResult" :key="idx"
          class="bg-white border border-gray-200 rounded-2xl shadow-sm p-3 flex flex-row gap-4 h-[120px] mb-3 last:mb-0 transition-all duration-200 hover:shadow-md hover:border-blue-400">
          <!-- Cột ảnh -->
          <div
            class="w-1/3 max-w-[120px] h-full flex items-center justify-center bg-gray-100 rounded-xl overflow-hidden">
            <img :src="'data:image/jpeg;base64,' + item.base64" class="max-h-full max-w-full object-contain"
              alt="Detection Frame" />
          </div>

          <!-- Cột kết quả -->
          <div class="w-2/3 flex flex-col justify-center">
            <!-- Fake/Real label -->
            <div class="flex items-center font-semibold text-base mb-2"
              :class="parseFloat(item.real) > parseFloat(item.fake) ? 'text-green-600' : 'text-red-600'">
              <svg v-if="parseFloat(item.real) > parseFloat(item.fake)" class="w-4 h-4 mr-1 text-green-500" fill="none"
                stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <svg v-else class="w-4 h-4 mr-1 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              {{ parseFloat(item.real) > parseFloat(item.fake) ? 'Real' : 'Fake' }}
            </div>

            <!-- Thanh bar -->
            <div class="w-full bg-gray-200 rounded-full h-3 relative">
              <div class="h-full rounded-full transition-all duration-300" :style="{
                width: Math.max(parseFloat(item.real), parseFloat(item.fake)) * 100 + '%',
                backgroundColor: getAccuracyColor(parseFloat(item.real), parseFloat(item.fake))
              }">
              </div>
            </div>

            <!-- Phần chữ % bên dưới thanh bar -->
            <div class="text-base text-gray-500 mt-1">
              Confidence: {{ (Math.max(parseFloat(item.real), parseFloat(item.fake)) * 100).toFixed(1) }}%
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-show="imageUrl" class="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full w-full">
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
          <img ref="imageRef" class="h-full w-full object-contain" :src="imageUrl" @load="onImageLoadDetect">
        </div>
      </div>
  </div>
</template>

<style scoped>
/* Scrollable Container with Vertical Layout */
.scrollable-container {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  max-height: 500px;
  padding: 8px;
}

/* Hover effect for the cards */
.hover\:scale-105:hover {
  transform: scale(1.05);
}

/* Custom color for accuracy bar */
.accuracy-bar {
  background-color: #facc15;
}

/* Custom styling for the accuracy bar tooltip */
.accuracy-tooltip {
  position: absolute;
  left: 50%;
  transform: translateX(-50%) translateY(-50%);
  opacity: 0;
  transition: opacity 0.3s;
}
</style>
