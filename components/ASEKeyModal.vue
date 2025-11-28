<script setup lang="ts">
import { ref, watch } from 'vue'
import { CryptoUtil, ASEKeyManager } from '../utils/crypto'

// Props
const props = defineProps({
  isOpen: Boolean,
})

// Emits
const emit = defineEmits(['update:isOpen', 'success', 'skip'])

// 状态��理
const keyInput = ref('')
const confirmKeyInput = ref('')
const loading = ref(false)
const errorMessage = ref('')
const showSkipOption = ref(false)

// 模态框打开时检查是否有现有密钥
watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    resetForm()
    // 检查是否有现有密钥
    const existingKey = ASEKeyManager.getKey()
    if (existingKey) {
      keyInput.value = existingKey
      showSkipOption.value = true
    }
  }
})

// 关闭模态框
function close() {
  emit('update:isOpen', false)
  resetForm()
}

// 重置表单
function resetForm() {
  keyInput.value = ''
  confirmKeyInput.value = ''
  errorMessage.value = ''
  loading.value = false
  showSkipOption.value = false
}

// 验证密钥格式
function validateKey(): boolean {
  const key = keyInput.value.trim()

  if (!key) {
    errorMessage.value = '请输入ASE密钥'
    return false
  }

  if (!CryptoUtil.validateKey(key)) {
    errorMessage.value = '密钥长度至少为8个字符'
    return false
  }

  // 如果是新设置密钥，需要确认
  if (!showSkipOption.value && key !== confirmKeyInput.value) {
    errorMessage.value = '两次输入的密钥不一致'
    return false
  }

  return true
}

// 测试密钥
async function testKey(): Promise<boolean> {
  try {
    loading.value = true
    errorMessage.value = ''

    const isValid = await CryptoUtil.testKey(keyInput.value)
    if (!isValid) {
      errorMessage.value = '密钥测试失败，请检查密钥是否正确'
      return false
    }

    return true
  } catch (error) {
    errorMessage.value = '密钥测试失败，请重试'
    return false
  } finally {
    loading.value = false
  }
}

// 保存密钥
async function saveKey() {
  if (!validateKey()) {
    return
  }

  // 如果是新设置密钥，先测试
  if (!showSkipOption.value) {
    const isValid = await testKey()
    if (!isValid) {
      return
    }
  }

  try {
    loading.value = true

    // 保存密钥
    ASEKeyManager.setKey(keyInput.value.trim())

    emit('success')
    close()
  } catch (error) {
    errorMessage.value = '保存密钥失败，请重试'
  } finally {
    loading.value = false
  }
}

// 跳过设置
function skipSetup() {
  if (showSkipOption.value) {
    emit('skip')
    close()
  }
}

// 进阶优化：弹窗打开时，禁止背景页面滚动
watch(() => props.isOpen, (newVal) => {
  if (import.meta.client) {
    document.body.style.overflow = newVal ? 'hidden' : ''
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="modal-overlay" @click.self="close">
        <div class="modal-content">
          <!-- 模态框头部 -->
          <div class="modal-header">
            <h2>{{ showSkipOption ? 'ASE密钥设置' : '设置ASE密钥' }}</h2>
            <button class="close-btn" @click="close" :disabled="loading">×</button>
          </div>

          <!-- 内容区域 -->
          <div class="key-setup-content">
            <!-- 说明文字 -->
            <div class="description">
              <div class="info-box">
                <div class="info-icon">🔒</div>
                <div class="info-text">
                  <h3>什么是ASE密钥？</h3>
                  <p>ASE密钥用于加密您的剪贴板内容，确保数据在传输和存储过程中的安全性。</p>
                  <ul class="info-list">
                    <li>所有剪贴板内容都将在本地加密后再上传</li>
                    <li>只有知道密钥的人才能解密和查看内容</li>
                    <li>密钥不会上传到服务器，请妥善保管</li>
                  </ul>
                </div>
              </div>
            </div>

            <!-- 密钥输入表单 -->
            <div class="key-form">
              <div class="form-group">
                <label for="keyInput">ASE密钥</label>
                <input
                  id="keyInput"
                  v-model="keyInput"
                  type="password"
                  class="form-input"
                  :disabled="loading"
                  placeholder="请输入至少8个字符的密钥"
                  autocomplete="new-password"
                />
                <div class="input-hint">建议使用复杂的字符串组合，包含字母、数字和特殊字符</div>
              </div>

              <!-- 确认密钥（仅新设置时显示） -->
              <div v-if="!showSkipOption" class="form-group">
                <label for="confirmKeyInput">确认密钥</label>
                <input
                  id="confirmKeyInput"
                  v-model="confirmKeyInput"
                  type="password"
                  class="form-input"
                  :disabled="loading"
                  placeholder="请再次输入密钥"
                  autocomplete="new-password"
                />
              </div>

              <!-- 错误信息 -->
              <div v-if="errorMessage" class="error-message">
                {{ errorMessage }}
              </div>
            </div>

            <!-- 按钮区域 -->
            <div class="button-group">
              <button
                class="save-btn"
                @click="saveKey"
                :disabled="loading"
              >
                {{ loading ? '保存中...' : (showSkipOption ? '修改密钥' : '保存密钥') }}
              </button>

              <!-- 跳过按钮（仅修改模式显示） -->
              <button
                v-if="showSkipOption"
                class="skip-btn"
                @click="skipSetup"
                :disabled="loading"
              >
                跳过
              </button>
            </div>

            <!-- 安全提示 -->
            <div class="security-warning">
              <div class="warning-icon">⚠️</div>
              <div class="warning-text">
                <strong>安全提示：</strong>
                <ul>
                  <li>请妥善保管您的密钥，丢失密钥将无法恢复数据</li>
                  <li>建议定期更换密钥以提高安全性</li>
                  <li>不要在不安全的环境中输入密钥</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 核心样式：脱离文档流 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  min-width: 480px;
  max-width: 95%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: 24px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
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

.close-btn:hover:not(:disabled) {
  background-color: #f3f4f6;
  color: #374151;
}

.close-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.key-setup-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.description {
  margin-bottom: 8px;
}

.info-box {
  display: flex;
  gap: 12px;
  padding: 16px;
  background-color: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
}

.info-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.info-text h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #0c4a6e;
}

.info-text p {
  margin: 0 0 12px 0;
  color: #075985;
  line-height: 1.5;
}

.info-list {
  margin: 0;
  padding-left: 16px;
  color: #075985;
}

.info-list li {
  margin-bottom: 4px;
  font-size: 14px;
  line-height: 1.4;
}

.key-form {
  margin-bottom: 8px;
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

.input-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
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

.button-group {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.save-btn {
  flex: 1;
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

.save-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.save-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.skip-btn {
  padding: 12px 16px;
  background-color: #6b7280;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.skip-btn:hover:not(:disabled) {
  background-color: #4b5563;
}

.security-warning {
  display: flex;
  gap: 8px;
  padding: 12px;
  background-color: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 6px;
  font-size: 12px;
}

.warning-icon {
  flex-shrink: 0;
  font-size: 16px;
}

.warning-text {
  flex: 1;
  line-height: 1.4;
}

.warning-text ul {
  margin: 4px 0 0 0;
  padding-left: 16px;
}

.warning-text li {
  margin-bottom: 2px;
}

/* 响应式设计 */
@media (max-width: 640px) {
  .modal-content {
    min-width: auto;
    width: 100%;
    margin: 0 16px;
    padding: 20px;
  }

  .modal-overlay {
    padding: 0;
  }

  .info-box {
    flex-direction: column;
    gap: 8px;
  }

  .button-group {
    flex-direction: column;
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