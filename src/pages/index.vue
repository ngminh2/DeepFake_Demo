<script setup lang="ts">
import { ref, watch, computed, onMounted } from 'vue';
import { globalActiveKey } from '~/composables';
import { stopDetection, closeWebSocket } from '~/composables/detect';

const isConfigOpen = ref(false);
const selectedModel = ref('Deep Face Anti-Spoofing');
const modelOptions = ['Deep Face Anti-Spoofing', 'DeepFake Segmentation'];
const screenWidth = ref(window.innerWidth);

const modelConfigs = ref({
  'Deep Face Anti-Spoofing': {
    accuracyThreshold: { label: 'Accuracy Threshold', value: 0, type: 'slider', min: 0, max: 1, step: 0.01 },
    confidenceFaceThreshold: { label: "Confidence's Face Threshold", value: 0.25, type: 'slider', min: 0, max: 1, step: 0.01 },
    iouThreshold: { label: 'IoU Threshold', value: 0.7, type: 'slider', min: 0, max: 1, step: 0.01 },
    maxDetections: { label: 'Maximum Detections', value: 300, type: 'slider', min: 1, max: 1000, step: 10 }
  },
  'DeepFake Segmentation': {
    inpSize: { label: 'Model Input Image Size', value: 512, type: 'slider', min: 2, max: 512, step: 1 },
    alphaBlend: { label: 'Alpha Blending Factor', value: 0.7, type: 'slider', min: 0, max: 1, step: 0.01 }
  }
});

const currentConfig = computed(() => modelConfigs.value[selectedModel.value]);

watch(() => globalActiveKey.value, () => {
  stopDetection();
  closeWebSocket();
});

const updateScreenWidth = () => {
  screenWidth.value = window.innerWidth;
  if (screenWidth.value >= 768) isConfigOpen.value = true;
};

onMounted(() => {
  window.addEventListener('resize', updateScreenWidth);
  updateScreenWidth();
});

const mainContentStyle = computed(() => {
  return {
    marginRight: isConfigOpen.value && screenWidth.value >= 768 ? '350px' : '0',
    padding: screenWidth.value < 768 ? '12px' : '24px'
  };
});
</script>

<template>
  <div class="relative flex min-h-screen h-auto overflow-auto dark:bg-gray-900">
    <div class="flex-1 transition-all" :style="mainContentStyle">
      <a-typography>
        <a-typography-title class="main-title dark:text-white">Deepfake Demo</a-typography-title>
        <div class="tabs-container">
          <a-tabs v-model:active-key="globalActiveKey" lazy-load>
            <a-tab-pane key="1" title="Picture">
              <TabsPicture :model="selectedModel" :parameters="currentConfig" />
            </a-tab-pane>
            <a-tab-pane key="2" title="Video">
              <TabsVideo :model="selectedModel" :parameters="currentConfig" />
            </a-tab-pane>
            <a-tab-pane key="3" title="WebCam">
              <TabsWebCam :model="selectedModel" :parameters="currentConfig" />
            </a-tab-pane>
          </a-tabs>
        </div>
      </a-typography>
    </div>

    <transition name="slide">
      <div :class="['config-panel', isConfigOpen ? 'open' : 'closed']">
        <div class="config-header" @click="isConfigOpen = !isConfigOpen">
          <span class="chevron">{{ isConfigOpen ? '❯' : '❮' }}</span>
        </div>
        <div v-if="isConfigOpen" class="config-content">
          <h1 class="text-2xl font-bold mb-4 text-gray-900 dark:text-white mt-6">Settings</h1>

          <div class="config-item">
            <label class="config-label dark:text-white">Select Model</label>
            <a-select v-model="selectedModel" :options="modelOptions" class="w-full dark:bg-gray-800 dark:text-white" />
          </div>

          <div v-for="(param, key) in currentConfig" :key="key" class="config-item">
            <label class="config-label dark:text-white">{{ param.label }}</label>

            <div v-if="param.type === 'slider'" class="slider-container">
              <a-slider v-model="param.value" :min="param.min" :max="param.max" :step="param.step"
                class="w-full dark:bg-gray-700 dark:text-white" />
              <span class="slider-value dark:text-white">{{ param.value }}</span>
            </div>

            <a-input-number v-if="param.type === 'input-number'" v-model="param.value" :min="param.min" :max="param.max"
              class="w-full dark:bg-gray-700 dark:text-white" />
          </div>

          <div class="config-item-custom flex items-center justify-center">
            <button class="icon-btn" @click="toggleDark()">
              <div dark:i-carbon-moon i-carbon-sun />
            </button>
          </div>

        </div>
      </div>
    </transition>
  </div>
</template>

<style>
.main-title {
  font-size: 26px;
  text-align: center;
  margin-bottom: 10px;
}

.tabs-container {
  max-width: 100%;
  overflow-x: auto;
  padding: 0 10px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.flex-1 {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.config-panel {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  background: #ece6e6;
  color: black;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease-in-out;
  width: 350px;
  border-left: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  padding: 20px;
}

.dark .config-panel {
  background: #1e1e1e;
  color: white;
}

.config-panel.closed {
  transform: translateX(100%);
}

.config-panel.open {
  transform: translateX(0);
}

.config-header {
  position: absolute;
  left: -36px;
  top: 50%;
  transform: translateY(-50%);
  background: #1a73e8;
  color: white;
  padding: 8px;
  border-radius: 5px 0 0 5px;
  cursor: pointer;
}

.chevron {
  font-size: 38px;
}

.config-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: white;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.dark .config-item {
  background: #2d2d2d;
  color: white;
}

.config-label {
  font-size: 16px;
  font-weight: 600;
  color: #222;
}

.dark .config-label {
  color: white;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider-value {
  font-weight: bold;
  color: black;
  min-width: 50px;
  text-align: right;
}

.dark .slider-value {
  color: white;
}

.config-item-custom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
}

.icon-btn div {
  font-size: 35px;
}

@media (max-width: 768px) {
  .main-title {
    font-size: 22px;
    margin-bottom: 8px;
  }

  .config-panel {
    width: 80%;
    max-width: 300px;
  }

  .config-header {
    left: -32px;
  }

  .chevron {
    font-size: 30px;
  }
}
</style>