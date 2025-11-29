<script setup lang="ts">
import LoginModal from '../components/LoginModal.vue'
import ASEKeyModal from '../components/ASEKeyModal.vue'
// import supabase from '../utils/supabase'
import { CryptoUtil, ASEKeyManager } from '../utils/crypto'
import '../style/global.css'
import MessageContent from '../components/MessageContent.vue'

const supabase = useSupabaseClient()

interface TossMessage {
  text_id: string
  content: string
  created_at: string
  user_id: string
  encrypted: boolean
}

const showLoginModal = ref(false)
const showASEKeyModal = ref(false)
const currentUser = ref()
const tossMessages = ref<TossMessage[]>()
const textContainerRef = ref < HTMLElement | null > (null)

function scrollToBottom() {
  if (textContainerRef.value) {
    textContainerRef.value.scrollTo({
      top: textContainerRef.value.scrollHeight,
      behavior: 'smooth',
    })
  }
}

// 显示ASE密钥设置模态框
function showASEKeyModalHandler() {
  showASEKeyModal.value = true
}

// ASE密钥设置成功
async function handleASEKeySuccess() {
  showASEKeyModal.value = false

  // 如果用户已登录，重新加载所有数据以应用新的加密/解密设置
  if (currentUser.value) {
    console.log('密钥设置成功，重新加载数据...')
    try {
      // 清空当前数据
      tossMessages.value = []

      // 重新获取所有数据
      const data = await selectAllTossMessages()
      if (data) {
        tossMessages.value = data
        console.log(`重新加载了 ${data.length} 条数据`)
      }
    } catch (error) {
      console.error('重新加载数据失败:', error)
    }
  }
}

function listenSupabaseChannel() {
  supabase
    .channel('user_private_channel') 
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'clipboard',
        filter: `user_id=eq.${currentUser.value.id}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          console.log('收到新数据:', payload.new)
          // 确保新数据有加密标识
          const newItem = {
            ...payload.new,
            encrypted: !!payload.new.encrypted // 确保加密字段存在
          }

          // 添加到数据列表
          
          tossMessages.value = [...tossMessages.value as any[], newItem]

          // 滚动到底部显示新内容
          nextTick(() => {
            scrollToBottom()
          })
        }
      },
    )
    .subscribe()
}

// 处理登录成功
async function handleLoginSuccess(user: any) {
  currentUser.value = user
  tossMessages.value = await selectAllTossMessages()
  listenSupabaseChannel()
}

// 处理登出
function handleLogout() {
  currentUser.value = null
  tossMessages.value = []
}

// 检查当前用户状态
onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return
  }
  currentUser.value = user
  tossMessages.value = await selectAllTossMessages()
  listenSupabaseChannel()
})

async function selectAllTossMessages() : Promise<TossMessage[] | []> {
  if (!currentUser.value) {
    return []
  }
  const { data,error } = await supabase
    .from('clipboard')
    .select('*')
    .eq('user_id', currentUser.value.id)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('Error fetching toss messages:', error)
    return []
  } 
  return data
}

const text = ref<string>('')
async function sendTossMessage() {
  if (text.value.trim() === '') {
    return
  }
  if (!currentUser.value) {
    // 使用更友好的提示
    showLoginModal.value = true
    return
  }

  let contentToSave = text.value

  // 如果有ASE密钥，加密内容
  const aseKey = ASEKeyManager.getKey()
  if (aseKey) {
    try {
      contentToSave = CryptoUtil.encrypt(text.value, aseKey)
    } catch (error) {
      console.error('Encryption failed:', error)
      // 加密失败时提示用户
      alert('内容加密失败，请检查ASE密钥设置')
      return
    }
  }

  const { data, error } = await supabase
    .from('clipboard')
    .insert([
      {
        content: contentToSave,
        user_id: currentUser.value.id,
        encrypted: !!aseKey // 标记是否已加密
      },
    ])
    .select()
  if (error) {
    console.error('Error inserting toss message:', error)
    alert('发送失败，请重试')
    return
  }
  text.value = ''
}

// 解密内容
function decryptContent(content: string, isEncrypted: boolean): string {
  if (!isEncrypted) {
    return content
  }
  const aseKey = ASEKeyManager.getKey()
  if (!aseKey) {
    return '[加密内容 - 需要ASE密钥]'
  }
  try {
    return CryptoUtil.decrypt(content, aseKey)
  } catch (error) {
    console.error('Decryption failed:', error)
    return '[解密失败 - 密钥错误]'
  }
}

// 用于模板显示的解密内容函数
const decryptTextContent = (content: string, isEncrypted = false) => {
  if (!isEncrypted) {
    return content
  }
  // 现在decryptContent是同步的，可以直接调用
  try {
    return decryptContent(content, isEncrypted)
  } catch (error) {
    return '[解密失败]'
  }
}

// 复制到剪贴板功能
async function copyToClipboard(text: any) {
  try {
    let contentToCopy = text.content
    if (text.encrypted) contentToCopy = decryptContent(text.content, true)
    await navigator.clipboard.writeText(contentToCopy)
    // 可以添加一个成功提示
    alert('内容已复制到剪贴板')
  } catch (error) {
    console.error('Copy failed:', error)
    alert('复制失败')
  }
}

const hasASEKey = computed(()=> ASEKeyManager.hasKey())
</script>

<template>
  <div>
    <div h-100vh w-100vw flex items-center justify-center bg-gray-100>
      <LoginModal
        v-model:is-open="showLoginModal"
        :current-user="currentUser"
        @login-success="handleLoginSuccess"
        @logout="handleLogout"
        @showASEKeyModal="showASEKeyModalHandler"
      />
      <ASEKeyModal
        v-model:is-open="showASEKeyModal"
        @success="handleASEKeySuccess"
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
              @click="showLoginModal = true"
            />
            <div
              v-else
              h-6 w-6 cursor-pointer rounded-full bg-amber
              title="点击登录"
              @click="showLoginModal = true"
            />
          </div>
        </div>
        <div ref="textContainerRef" border-t="solid gray-300 1" border-b="solid gray-300 1"class="flex-1 overflow-auto p-4">
          <div v-for="text in tossMessages" :key="text.id">
            <div my-2 text-center text-10px text-gray-400>
              {{ new Date(text.created_at) .toLocaleString () }}
              <span v-if="text.encrypted" ml-2 text-amber-600>🔒 已加密</span>
            </div>
            <div flex items-center justify-end gap-2 rounded text-sm>
              <div i-ic:baseline-content-copy cursor-pointer bg-gray-400 @click="copyToClipboard(text)" />
              <p
                border="solid gray-300 1" rounded-2xl p-2 shadow-sm
                :class="{ 'encrypted-content': text.encrypted }"
              >
                <MessageContent :content="text.encrypted ? decryptTextContent(text.content, true) : text.content" />
              </p>
            </div>
          </div>
        </div>
        <div class="fotter" h-18 flex flex-col items-center justify-between px-10 py-4>
          <div border="solid gray-300 1" rounded="lg" class="w-full flex items-center gap-2 px-5">
            <div i-ic:outline-file-present h-6 w-6 />
            <input
              v-model="text"
              type="text"
              class="flex-1 border-none bg-gray-100 outline-none"
              placeholder="输入内容"
            >
            <div rounded="lg" class="cursor-pointer bg-purple p-1" @click="sendTossMessage">
              <div i-ic:baseline-send h-5 w-5 bg-white />
            </div>
          </div>
          <div class=" text-gray-400 text-xs flex items-center gap-2">
            <span>Drag & Drop files anywhere to upload</span>
            <div v-if="hasASEKey" class="flex items-center gap-1">
              🔒 已加密
            </div>
            <div v-else class="items-center gap-1 flex">
              未加密
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
