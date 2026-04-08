<script setup lang="ts">
const features = [
  { title: '工具', description: '创建可执行函数，使 AI 模型能够执行操作并检索信息。', icon: 'i-lucide-hammer' },
  { title: '资源', description: '共享数据，如文件、数据库记录或 API 响应，作为 AI 模型的上下文。', icon: 'i-lucide-file-text' },
  { title: '提示词', description: '构建可重用的模板和工作流，以指导 AI 交互并标准化使用。', icon: 'i-lucide-terminal-square' },
]

const tabs = ['工具', '资源', '提示词'] as const
const activeTab = ref(0)
</script>

<template>
  <UPageSection
    :features="features"
    orientation="horizontal"
    :ui="{ container: 'lg:items-start' }"
  >
    <template #title>
      <ChromaText>
        <slot
          name="title"
          mdc-unwrap="p"
        />
      </ChromaText>
    </template>

    <template #description>
      <slot
        name="description"
        mdc-unwrap="p"
      />
    </template>

    <ClientOnly>
      <div>
        <div class="flex border-b border-default mb-4">
          <button
            v-for="(tab, i) in tabs"
            :key="tab"
            class="px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2"
            :class="activeTab === i ? 'border-primary text-highlighted' : 'border-transparent text-muted hover:text-highlighted'"
            @click="activeTab = i"
          >
            {{ tab }}
          </button>
        </div>
        <div
          v-show="activeTab === 0"
          class="*:my-0"
        >
          <slot name="tools" />
        </div>
        <div
          v-show="activeTab === 1"
          class="*:my-0"
        >
          <slot name="resources" />
        </div>
        <div
          v-show="activeTab === 2"
          class="*:my-0"
        >
          <slot name="prompts" />
        </div>
      </div>
    </ClientOnly>
  </UPageSection>
</template>
