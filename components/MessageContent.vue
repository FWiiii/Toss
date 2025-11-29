<script setup lang="ts">
import { isUrl, normalizeUrl } from '../utils/url'

const props = defineProps({
  content: {
    type: String,
    required: true,
  },
})

interface Meta {
  title: string
  description: string
  image?: string
  url: string
}

// 状态：如果是 URL，这就是它的元数据
const meta = ref<Meta>(null)

const loading = ref(false)

// 判断是否是 URL
const isLink = computed(() => isUrl(props.content))

// 如果是链接，组件挂载时去抓取预览信息
onMounted(async () => {
  if (isLink.value) {
    loading.value = true
    const normalized = normalizeUrl(props.content)

    try {
      // 调用我们刚才写的 Nuxt API
      const data = await $fetch('/api/meta', {
        query: { url: normalized },
      })
      meta.value = data
    }
    catch (e) {
      // 失败了就算了，只显示链接
    }
    finally {
      loading.value = false
    }
  }
})
</script>

<template>
  <div>
    <div v-if="isLink" class="max-w-sm">
      <a
        v-if="!meta?.title"
        :href="normalizeUrl(content)"
        target="_blank"
        class="break-all text-blue-600 underline"
      >
        {{ content }}
      </a>

      <a
        v-else
        :href="normalizeUrl(content)"
        target="_blank"
        class="group block overflow-hidden border border-gray-200 rounded-lg bg-white decoration-0 transition hover:shadow-md"
      >
        <div v-if="meta.image" class="h-32 w-full overflow-hidden bg-gray-100">
          <img :src="meta.image" class="object-cover h-full w-full transition duration-500 group-hover:scale-105" alt="Cover">
        </div>

        <div class="p-3">
          <h3 class="line-clamp-1 text-sm text-gray-800 font-bold">{{ meta.title }}</h3>
          <p class="line-clamp-2 mt-1 text-xs text-gray-500">{{ meta.description }}</p>
          <div class="mt-2 flex items-center gap-1 text-[10px] text-gray-400">
            <span class="inline-block h-3 w-3 rounded-full bg-gray-200" /> {{ normalizeUrl(content) }}
          </div>
        </div>
      </a>
    </div>

    <div v-else class="whitespace-pre-wrap break-words">
      {{ content }}
    </div>
  </div>
</template>
