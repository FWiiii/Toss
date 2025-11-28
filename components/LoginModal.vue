<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import supabase from '../utils/supabase'
import { ASEKeyManager } from '../utils/crypto'

// 接收父组件传来的 props
const props = defineProps({
  isOpen: Boolean,
  currentUser: Object, // 接收当前用户信息
})

// 定义事件，用于通知父组件关闭、登录成功和登出
const emit = defineEmits(['update:isOpen', 'close', 'loginSuccess', 'logout', 'showASEKeyModal'])

// 状态管理
const isLogin = ref(true) // true为登录，false为注册
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMessage = ref('')

// 关闭模态框
function close() {
  emit('update:isOpen', false)
  emit('close')
  resetForm()
}

// 重置表单
function resetForm() {
  email.value = ''
  password.value = ''
  confirmPassword.value = ''
  errorMessage.value = ''
  loading.value = false
}

// 切换登录/注册模式
function toggleMode() {
  isLogin.value = !isLogin.value
  errorMessage.value = ''
}

// 表单验证
function validateForm() {
  if (!email.value.trim()) {
    errorMessage.value = '请输入邮箱地址'
    return false
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    errorMessage.value = '请输入有效的邮箱地址'
    return false
  }

  if (!password.value) {
    errorMessage.value = '请输入密码'
    return false
  }

  if (password.value.length < 6) {
    errorMessage.value = '密码长度至少为6位'
    return false
  }

  if (!isLogin.value && password.value !== confirmPassword.value) {
    errorMessage.value = '两次输入的密码不一致'
    return false
  }

  return true
}

// 处理登录
async function handleLogin() {
  if (!validateForm()) return

  loading.value = true
  errorMessage.value = ''

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    })

    if (error) throw error

    // 登录成功，检查ASE密钥
    emit('loginSuccess', data.user)
    close()

    // 检查是否有ASE密钥，如果没有则显示设置界面
    if (!ASEKeyManager.hasKey()) {
      emit('showASEKeyModal')
    }
  } catch (error) {
    errorMessage.value = (error as any).message || '登录失败，请重试'
  } finally {
    loading.value = false
  }
}

// 处理注册
async function handleSignup() {
  if (!validateForm()) return

  loading.value = true
  errorMessage.value = ''

  try {
    const { error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
    })

    if (error) throw error

    // 注册成功，显示确认信息
    errorMessage.value = '注册成功！请检查邮箱并确认账户'
    setTimeout(() => {
      isLogin.value = true
      resetForm()
    }, 2000)
  } catch (error) {
    errorMessage.value = (error as any).message || '注册失败，请重试'
  } finally {
    loading.value = false
  }
}

// 处理登出
async function handleLogout() {
  loading.value = true
  errorMessage.value = ''

  try {
    const { error } = await supabase.auth.signOut()

    if (error) throw error

    // 登出成功，通知父组件
    emit('logout')
    close()
  } catch (error) {
    errorMessage.value = (error as any).message || '登出失败，请重试'
  } finally {
    loading.value = false
  }
}

// 进阶优化：弹窗打开时，禁止背景页面滚动
watch(() => props.isOpen, (newVal) => {
  if (import.meta.client) {
    document.body.style.overflow = newVal ? 'hidden' : ''
  }
})

// ASE密钥管理
const ASEToken = ref('')
const aseKeyStatus = ref<'none' | 'valid' | 'invalid'>('none')

// 组件挂载时检查ASE密钥状态
onMounted(() => {
  checkASEKeyStatus()
})

// 检查ASE密钥状态
function checkASEKeyStatus() {
  try {
    const key = ASEKeyManager.getKey()
    if (key) {
      ASEToken.value = key
      const isValid = ASEKeyManager.isKeyValid()
      aseKeyStatus.value = isValid ? 'valid' : 'invalid'
    } else {
      aseKeyStatus.value = 'none'
    }
  } catch (error) {
    aseKeyStatus.value = 'invalid'
  }
}

// 保存或修改ASE密钥
async function saveASEToken() {
  const key = ASEToken.value.trim()

  if (!key) {
    errorMessage.value = '请输入ASE密钥'
    return
  }

  if (key.length < 8) {
    errorMessage.value = '密钥长度至少为8个字符'
    return
  }

  try {
    // 测试密钥是否有效
    const isValid = await ASEKeyManager.isKeyValid()
    if (isValid && key === ASEKeyManager.getKey()) {
      errorMessage.value = '密钥未发生变化'
      return
    }

    // 保存新密钥
    ASEKeyManager.setKey(key)
    checkASEKeyStatus()

    if (aseKeyStatus.value === 'valid') {
      errorMessage.value = '密钥保存成功'
      setTimeout(() => {
        errorMessage.value = ''
      }, 2000)
    } else {
      errorMessage.value = '密钥保存失败，请检查密钥格式'
    }
  } catch (error) {
    errorMessage.value = '密钥保存失败，请重试'
  }
}

// 删除ASE密钥
function removeASEToken() {
  if (confirm('确定要删除ASE密钥吗？删除后将无法解密之前加密的数据。')) {
    ASEKeyManager.removeKey()
    ASEToken.value = ''
    aseKeyStatus.value = 'none'
    errorMessage.value = '密钥已删除'
    setTimeout(() => {
      errorMessage.value = ''
    }, 2000)
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" 
      class="modal-overlay fixed top-0 left-0 w-full  h-full z-9999 p-5 bg-black bg-opacity-50 flex justify-center items-center" 
      @click.self="close"
      >
        <div class="modal-content bg-white rounded-xl max-w-90% min-w-360px max-h-90vh overflow-y-auto shadow-lg p-6"
        
        >
          <!-- 模态框头部 -->
          <div class="flex justify-between items-center mb-6 pb-4 border-b border-solid border-gray-200">
            <h2 v-if="currentUser" class="m-0 text-2xl font-semibold text-gray-900">账户信息</h2>
            <h2 v-else class="m-0 text-2xl font-semibold text-gray-900">{{ isLogin ? '登录' : '注册' }}</h2>
            <button class="border-none bg-transparent text-2xl cursor-pointer text-gray-500 p-1 rounded transition-all duration-200 hover:bg-gray-100 hover:text-gray-700" @click="close">×</button>
          </div>

          <!-- 已登录用户信息 -->
          <div v-if="currentUser" class="mb-5">
            <div class="flex items-center gap-4 mb-5 p-4 bg-gray-50 rounded-lg border-solid border border-gray-200">
              <div class="w-12 h-12 rounded-full bg-blue-500 text-white flex items-center justify-center text-lg font-semibold">
                {{ currentUser?.email?.charAt(0)?.toUpperCase() || 'U' }}
              </div>
              <div class="flex-1 text-sm text-gray-700 break-words">
                {{ currentUser?.email || '未知用户' }}
              </div>
            </div>

            <!-- 错误信息显示 -->
            <div v-if="errorMessage" class="mb-4 p-3 rounded-md text-sm bg-red-50 text-red-800 border border-red-200">
              {{ errorMessage }}
            </div>

            <!-- ASE密钥管理区域 -->
            <div class="mb-5 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div class="flex justify-between items-center mb-3">
                <h3 class="m-0 text-sm font-semibold text-gray-700">ASE密钥设置</h3>
                <div class="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium" :class="{
            'bg-yellow-100 text-yellow-800': aseKeyStatus === 'none',
            'bg-green-100 text-green-800': aseKeyStatus === 'valid',
            'bg-red-100 text-red-800': aseKeyStatus === 'invalid'
          }">
                  <span class="w-1.5 h-1.5 rounded-full bg-current"></span>
                  <span class="status-text">
                    {{ aseKeyStatus === 'none' ? '未设置' : aseKeyStatus === 'valid' ? '已设置' : '无效' }}
                  </span>
                </div>
              </div>

              <div class="flex gap-2 mb-3">
                <input
                  type="password"
                  v-model="ASEToken"
                  placeholder="输入ASE密钥（至少8个字符）"
                  class="flex-1 py-2 px-3 border border-gray-300 rounded-md text-sm outline-none transition-colors duration-200 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                />
                <div class="flex gap-1.5">
                  <button
                    class="py-2 px-3 bg-blue-500 text-white border-none rounded-md text-xs font-medium cursor-pointer transition-colors duration-200 whitespace-nowrap hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    @click="saveASEToken"
                    :disabled="!ASEToken.trim() || ASEToken.trim().length < 8"
                  >
                    {{ ASEToken === '' ? '保存' : '修改' }}
                  </button>
                  <button
                    v-if="aseKeyStatus !== 'none'"
                    class="py-2 px-3 bg-red-500 text-white border-none rounded-md text-xs font-medium cursor-pointer transition-colors duration-200 whitespace-nowrap hover:bg-red-600"
                    @click="removeASEToken"
                  >
                    删除
                  </button>
                </div>
              </div>

              <div class="mt-2">
                <p class="m-0 text-xs text-gray-500 leading-5">
                  🔒 ASE密钥用于加密剪贴板内容，确保数据安全
                </p>
              </div>
            </div>

            <!-- 登出按钮 -->
            <button
              class="w-full py-3 px-4 bg-red-500 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors duration-200 mb-5 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              @click="handleLogout"
              :disabled="loading"
            >
              {{ loading ? '处理中...' : '登出' }}
            </button>
          </div>

          <!-- 登录/注册表单 -->
          <form v-else @submit.prevent="isLogin ? handleLogin() : handleSignup()" class="mb-5">
            <!-- 邮箱输入 -->
            <div class="mb-4">
              <label for="email" class="block mb-1.5 font-medium text-gray-700 text-sm">邮箱</label>
              <input
                id="email"
                v-model="email"
                type="email"
                class="w-full py-2.5 px-3 border border-gray-300 rounded-md text-sm transition-colors duration-200 shadow-sm box-border focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                :disabled="loading"
                placeholder="请输入邮箱地址"
                required
              />
            </div>

            <!-- 密码输入 -->
            <div class="mb-4">
              <label for="password" class="block mb-1.5 font-medium text-gray-700 text-sm">密码</label>
              <input
                id="password"
                v-model="password"
                type="password"
                class="w-full py-2.5 px-3 border border-gray-300 rounded-md text-sm transition-colors duration-200 shadow-sm box-border focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                :disabled="loading"
                placeholder="请输入密码（至少6位）"
                required
              />
            </div>

            <!-- 确认密码（仅注册时显示） -->
            <div v-if="!isLogin" class="mb-4">
              <label for="confirmPassword" class="block mb-1.5 font-medium text-gray-700 text-sm">确认密码</label>
              <input
                id="confirmPassword"
                v-model="confirmPassword"
                type="password"
                class="w-full py-2.5 px-3 border border-gray-300 rounded-md text-sm transition-colors duration-200 shadow-sm box-border focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                :disabled="loading"
                placeholder="请再次输入密码"
                required
              />
            </div>

            <!-- 错误信息显示 -->
            <div v-if="errorMessage" class="mb-4 p-3 rounded-md text-sm border" :class="errorMessage.includes('注册成功') ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'">
              {{ errorMessage }}
            </div>

            <!-- 提交按钮 -->
            <button
              type="submit"
              class="w-full py-3 px-4 bg-blue-500 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors duration-200 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
              :disabled="loading"
            >
              {{ loading ? '处理中...' : (isLogin ? '登录' : '注册') }}
            </button>
          </form>

          <!-- 切换登录/注册模式 -->
          <div class="text-center pt-4 border-t border-gray-200 text-sm text-gray-500">
            <span>{{ isLogin ? '还没有账户？' : '已有账户？' }}</span>
            <button
              type="button"
              class="border-none bg-transparent text-blue-500 cursor-pointer font-medium underline-none ml-1 transition-colors duration-200 hover:text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed"
              @click="toggleMode"
              :disabled="loading"
            >
              {{ isLogin ? '立即注册' : '立即登录' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 响应式设计 */
@media (max-width: 480px) {
  .modal-content {
    min-width: auto;
    width: 100%;
    margin: 0 16px;
    padding: 20px;
  }

  .modal-overlay {
    padding: 0;
  }
}

/* 简单的淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
