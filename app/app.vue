<script setup lang="ts">
import BaseModal from '../components/BaseModal.vue'
import supabase from '../utils/supabase'
import '../style/global.css '

const showModal = ref(false)

supabase.channel('custom-all-channel')
  .on(
    'postgres_changes',
    { event: '*', schema: '*', table: 'text' },
    (payload) => {
      console.log('Change received!', payload)
    },
  )
  .subscribe()

let { data } = await supabase
  .from('text')
  .select('*')
</script>

<template>
  <div>
    <div h-100vh w-100vw flex items-center justify-center bg-gray-100>
      <BaseModal
        v-model:is-open="showModal"
        title="用户协议"
      >
        <p>这里是弹窗的具体内容...</p>

        <template #footer>
          <button @click="showModal = false">
            我已阅读
          </button>
        </template>
      </BaseModal>
      <div border="solid gray-300 1" h-full w-200 flex flex-col md:h-150>
        <div class="header" h-10 flex items-center justify-between px-10>
          <div text-xl font-bold>
            Toss
          </div>
          <div flex gap-5>
            <div i-ic:baseline-settings h-6 w-6 />
            <div h-6 w-6 rounded-full bg-amber @click="showModal = true" />
          </div>
        </div>
        <div class="content" border-t="solid gray-300 1" border-b="solid gray-300 1" flex-1 overflow-auto>
          <div v-for="text in data" :key="text.id">
            <div mt-2 text-center text-10px text-gray-400>
              {{ new Date(text.created_at) .toLocaleString () }}
            </div>
            <div flex items-center justify-end gap-2 rounded text-sm>
              <div i-ic:baseline-content-copy cursor-pointer bg-gray-400 />
              <p border="solid gray-300 1" mr-4 rounded-2xl p-2 shadow-sm>
                {{ text.content }}
              </p>
            </div>
          </div>
        </div>
        <div class="fotter" h-18 flex flex-col items-center justify-between px-10 py-4>
          <div border="solid gray-300 1" rounded="lg" h-10 w-full flex items-center gap-2 px-5>
            <div i-ic:outline-file-present h-6 w-6 />
            <input type="text" class="text-input" flex-1 border-none bg-gray-100 outline-none placeholder="Paste text (Ctrl+V) or type here...">
            <div rounded="lg" cursor-pointer bg-purple p-1>
              <div i-ic:baseline-send h-5 w-5 bg-white />
            </div>
          </div>
          <div text-10px text-gray-400>
            Drag & Drop files anywhere to upload
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
