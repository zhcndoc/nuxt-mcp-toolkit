<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <div class="hidden md:block">
    <UButton
      v-if="route.path === '/'"
      to="/getting-started/installation"
      label="开始使用"
      variant="ghost"
      trailing
      icon="i-lucide-arrow-right"
    />
  </div>
</template>
