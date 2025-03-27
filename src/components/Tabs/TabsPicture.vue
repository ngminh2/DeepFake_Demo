<script lang="ts" setup>
import { useFileSystemAccess } from '@vueuse/core'
import { globalActiveKey } from '~/composables'
import { defineProps } from 'vue'

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
  if (file.value)
    imageUrl.value = URL.createObjectURL(file.value)
})
onMounted(() => {
  if (!isSupported.value)
    alert('Web File System Access API !')
})
watch(() => globalActiveKey.value, () => {
  URL.revokeObjectURL(imageUrl.value)
  imageUrl.value = ''
})
function onImageLoadDetect() {
  if (props.model === 'Deep Face Anti-Spoofing') {
    detectFAS(imageRef.value, canvasRef.value, props.parameters)
  } else if (props.model === 'DeepFake Segmentation') {
    // detect2(imageRef.value, canvasRef.value);
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

    <div v-show="imageUrl" class="relative h-full w-full">
      <img ref="imageRef" class="h-full w-full" :src="imageUrl" controls @load="onImageLoadDetect">
      <canvas ref="canvasRef" class="absolute top-0 w-full h-full pointer-events-none" :width="inputShape[1]" :height="inputShape[2]" />
    </div>
  </div>
</template>
