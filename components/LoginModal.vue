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
      class="modal-overlay" 
      @click.self="close"
      fixed top-0 left-0 w-full h-full z-9999 p-5 bg-black bg-opacity-50 flex justify-center items-center
      >
        <div class="modal-content"
        bg-white rounded-xl min-w-360px max-h-90vh overflow-y-auto shadow-lg p-6
        >
          <!-- 模态框头部 -->
          <div class="modal-header">
            <h2 v-if="currentUser">账户信息</h2>
            <h2 v-else>{{ isLogin ? '登录' : '注册' }}</h2>
            <button class="close-btn" @click="close">×</button>
          </div>

          <!-- 已登录用户信息 -->
          <div v-if="currentUser" class="user-info">
            <div class="user-details">
              <div class="user-avatar">
                {{ currentUser?.email?.charAt(0)?.toUpperCase() || 'U' }}
              </div>
              <div class="user-email">
                {{ currentUser?.email || '未知用户' }}
              </div>
            </div>

            <!-- 错误信息显示 -->
            <div v-if="errorMessage" class="error-message">
              {{ errorMessage }}
            </div>

            <!-- ASE密钥管理区域 -->
            <div class="ase-key-section">
              <div class="section-header">
                <h3>ASE密钥设置</h3>
                <div class="key-status" :class="aseKeyStatus">
                  <span class="status-indicator"></span>
                  <span class="status-text">
                    {{ aseKeyStatus === 'none' ? '未设置' : aseKeyStatus === 'valid' ? '已设置' : '无效' }}
                  </span>
                </div>
              </div>

              <div class="key-input-group">
                <input
                  type="password"
                  v-model="ASEToken"
                  placeholder="输入ASE密钥（至少8个字符）"
                  class="key-input"
                />
                <div class="key-actions">
                  <button
                    class="btn-save"
                    @click="saveASEToken"
                    :disabled="!ASEToken.trim() || ASEToken.trim().length < 8"
                  >
                    {{ ASEToken === '' ? '保存' : '修改' }}
                  </button>
                  <button
                    v-if="aseKeyStatus !== 'none'"
                    class="btn-remove"
                    @click="removeASEToken"
                  >
                    删除
                  </button>
                </div>
              </div>

              <div class="key-info">
                <p class="info-text">
                  🔒 ASE密钥用于加密剪贴板内容，确保数据安全
                </p>
              </div>
            </div>

            <!-- 登出按钮 -->
            <button
              class="logout-btn"
              @click="handleLogout"
              :disabled="loading"
            >
              {{ loading ? '处理中...' : '登出' }}
            </button>
          </div>

          <!-- 登录/注册表单 -->
          <form v-else @submit.prevent="isLogin ? handleLogin() : handleSignup()" class="auth-form">
            <!-- 邮箱输入 -->
            <div class="form-group">
              <label for="email">邮箱</label>
              <input
                id="email"
                v-model="email"
                type="email"
                class="form-input"
                :disabled="loading"
                placeholder="请输入邮箱地址"
                required
              />
            </div>

            <!-- 密码输入 -->
            <div class="form-group">
              <label for="password">密码</label>
              <input
                id="password"
                v-model="password"
                type="password"
                class="form-input"
                :disabled="loading"
                placeholder="请输入密码（至少6位）"
                required
              />
            </div>

            <!-- 确认密码（仅注册时显示） -->
            <div v-if="!isLogin" class="form-group">
              <label for="confirmPassword">确认密码</label>
              <input
                id="confirmPassword"
                v-model="confirmPassword"
                type="password"
                class="form-input"
                :disabled="loading"
                placeholder="请再次输入密码"
                required
              />
            </div>

            <!-- 错误信息显示 -->
            <div v-if="errorMessage" class="error-message" :class="{ 'success-message': errorMessage.includes('注册成功') }">
              {{ errorMessage }}
            </div>

            <!-- 提交按钮 -->
            <button
              type="submit"
              class="submit-btn"
              :disabled="loading"
            >
              {{ loading ? '处理中...' : (isLogin ? '登录' : '注册') }}
            </button>
          </form>

          <!-- 切换登录/注册模式 -->
          <div class="switch-mode">
            <span>{{ isLogin ? '还没有账户？' : '已有账户？' }}</span>
            <button
              type="button"
              class="switch-btn"
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

.modal-content {
  max-width: 90%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
}

.close-btn {
  border: none;
  background: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.auth-form {
  margin-bottom: 20px;
}

.user-info {
  margin-bottom: 20px;
}

.user-details {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.user-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: #3b82f6;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
}

.user-email {
  flex: 1;
  font-size: 14px;
  color: #374151;
  word-break: break-all;
}

.logout-btn {
  width: 100%;
  padding: 12px 16px;
  background-color: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 20px;
}

.logout-btn:hover:not(:disabled) {
  background-color: #dc2626;
}

.logout-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #374151;
  font-size: 14px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-input:disabled {
  background-color: #f9fafb;
  color: #6b7280;
  cursor: not-allowed;
}

.error-message {
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 6px;
  font-size: 14px;
  background-color: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.success-message {
  background-color: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.submit-btn {
  width: 100%;
  padding: 12px 16px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.submit-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.switch-mode {
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  font-size: 14px;
  color: #6b7280;
}

.switch-btn {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  font-weight: 500;
  text-decoration: underline;
  margin-left: 4px;
  transition: color 0.2s;
}

.switch-btn:hover:not(:disabled) {
  color: #2563eb;
}

.switch-btn:disabled {
  color: #9ca3af;
  cursor: not-allowed;
}

/* ASE密钥管理样式 */
.ase-key-section {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.key-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.key-status.none {
  background-color: #fef3c7;
  color: #92400e;
}

.key-status.valid {
  background-color: #d1fae5;
  color: #065f46;
}

.key-status.invalid {
  background-color: #fee2e2;
  color: #991b1b;
}

.status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
}

.key-input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.key-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.key-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.key-actions {
  display: flex;
  gap: 6px;
}

.btn-save {
  padding: 8px 12px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.btn-save:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn-save:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.btn-remove {
  padding: 8px 12px;
  background-color: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
}

.btn-remove:hover {
  background-color: #dc2626;
}

.key-info {
  margin-top: 8px;
}

.info-text {
  margin: 0;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
}

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
