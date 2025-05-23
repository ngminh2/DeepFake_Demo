<script lang="ts" setup>
import { useFileSystemAccess } from '@vueuse/core'
import { globalActiveKey } from '~/composables'
import { defineProps } from 'vue'

const accuracy = ref<number | null>(null)
const label = ref<'Real' | 'Fake' | null>(null)
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
  accuracy.value = null
  label.value = null
})

function onImageLoadDetect() {
  if (!imageUrl.value || !imageRef.value || !canvasRef.value) return

  if (props.model === 'Deep Face Anti-Spoofing') {
    detectFAS(imageRef.value, canvasRef.value, pingRef, props.parameters)
  } else if (props.model === 'DeepFake') {
    detectDF(imageRef.value, canvasRef.value, pingRef, accuracy, label, props.parameters)
  }
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
    accuracy.value = null
    label.value = null
  }
}

watch(() => props.model, () => {
  // Clear object URL and reset image
  URL.revokeObjectURL(imageUrl.value)
  imageUrl.value = ''
  accuracy.value = null
  label.value = null
  
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

    <div v-if="props.model === 'DeepFake'">
      <div v-if="accuracy !== null && label !== null" class="my-4 space-y-2">
        <div class="flex items-center justify-center space-x-3">
          <span
            class="px-3 py-1 rounded-full text-white text-sm font-semibold"
            :class="label === 'Real' ? 'bg-green-600' : 'bg-red-600'"
          >
            {{ label }}
          </span>
          <span class="text-lg font-bold text-gray-900 tracking-wide">
          Accuracy: <span class="text-primary">{{ accuracy.toFixed(2) }}%</span>
        </span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-5 overflow-hidden shadow-inner">
          <div
            class="h-full transition-all duration-700 ease-in-out"
            :class="label === 'Real' ? 'bg-green-500' : 'bg-red-500'"
            :style="{ width: accuracy + '%' }"
          ></div>
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

    <div v-else>
      <div v-show="imageUrl" class="relative h-full w-full">
        <div class="absolute top-0 left-0 bg-red-500 text-white font-bold p-2 sm:p-3 lg:p-4 flex items-center">
          <svg class="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none"
            viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8.5 16.5a3.5 3.5 0 017 0M5.07 12.93a8.5 8.5 0 0113.86 0M1.5 9a13 13 0 0121 0" />
          </svg>
          <span class="ml-1 text-base sm:text-lg lg:text-xl">{{ pingRef }}ms</span>
        </div>
        <img ref="imageRef" class="h-full w-full" :src="imageUrl" controls @load="onImageLoadDetect">
        <canvas ref="canvasRef" class="absolute top-0 w-full h-full pointer-events-none" :width="inputShape[1]"
          :height="inputShape[2]" />
      </div>
    </div>
  </div>
</template>