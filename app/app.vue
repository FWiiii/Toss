<script setup lang="ts">
import LoginModal from '../components/LoginModal.vue'
import supabase from '../utils/supabase'
import '../style/global.css '

const showModal = ref(false)
const currentUser = ref()

const tossData = ref([])

// 处理登录成功
function handleLoginSuccess(user) {
  currentUser.value = user
}

// 处理登出
function handleLogout() {
  currentUser.value = null
}

// 检查当前用户状态
onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    currentUser.value = user
  }
})

let { data } = await supabase
  .from('text')
  .select('*')

tossData.value = data

supabase.channel('custom-all-channel')
  .on(
    'postgres_changes',
    { event: '*', schema: '*', table: 'text' },
    (payload) => {
      console.log('Change received!', payload)
      if (payload.eventType === 'INSERT') {
        tossData.value = [...tossData.value, payload.new]
      }
    },
  )
  .subscribe()

const text = ref('')
async function insertText() {
  if (text.value.trim() === '') {
    return
  }

  const { data, error } = await supabase
    .from('text')
    .insert([
      { content: text.value },
    ])
    .select()
  text.value = ''
}
</script>

<template>
  <div>
    <div h-100vh w-100vw flex items-center justify-center bg-gray-100>
      <LoginModal
        v-model:is-open="showModal"
        :current-user="currentUser"
        @login-success="handleLoginSuccess"
        @logout="handleLogout"
      />
      <div border="solid gray-300 1" h-full w-full flex flex-col md:h-150 md:w-200>
        <div class="header" h-10 flex items-center justify-between px-10>
          <div text-xl font-bold>
            Toss
          </div>
          <div flex items-center gap-5>
            <div i-ic:baseline-settings h-6 w-6 />
            <div
              v-if="currentUser"
              h-6 w-6 cursor-pointer rounded-full bg-green
              :title="currentUser?.email || '已登录'"
              @click="showModal = true"
            />
            <div
              v-else
              h-6 w-6 cursor-pointer rounded-full bg-amber
              title="点击登录"
              @click="showModal = true"
            />
          </div>
        </div>
        <div class="content" border-t="solid gray-300 1" border-b="solid gray-300 1" flex-1 overflow-auto>
          <div v-for="text in tossData" :key="text.id">
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
            <input v-model="text" type="text" class="text-input" flex-1 border-none bg-gray-100 outline-none placeholder="Paste text (Ctrl+V) or type here...">
            <div rounded="lg" cursor-pointer bg-purple p-1 @click="insertText">
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
