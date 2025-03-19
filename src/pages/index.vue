<script setup lang="ts">
import { globalActiveKey } from '~/composables'

</script>

<template>
  <div>
    <a-typography :style="{ marginTop: '-40px' }">
      <a-typography-title>
        deepfake-webrtc-demo
      </a-typography-title>
      <div class="w-960px mx-auto">
        <a-tabs v-model:active-key="globalActiveKey" lazy-load>
          <a-tab-pane key="2" title="Video">
            <TabsVideo />
          </a-tab-pane>
          <a-tab-pane key="3" title="Picture">
            <TabsPicture />
          </a-tab-pane>
          <a-tab-pane key="4" title="WebCam">
            <TabsWebCam />
          </a-tab-pane>
        </a-tabs>
      </div>
    </a-typography>
  </div>
</template>
