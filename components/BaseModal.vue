<script setup>
// 接收父组件传来的 props
const props = defineProps({
  isOpen: Boolean,
})

// 定义事件，用于通知父组件关闭
const emit = defineEmits(['update:isOpen', 'close'])

function close() {
  emit('update:isOpen', false)
  emit('close')
}

// 进阶优化：弹窗打开时，禁止背景页面滚动
watch(() => props.isOpen, (newVal) => {
  if (process.client) {
    document.body.style.overflow = newVal ? 'hidden' : ''
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="isOpen" class="modal-overlay" h-50 w-90 flex flex-col @click.self="close">
        <div class="email">
          <input type="text" class="text-input" w-80 border="solid gray-300 1" rounded="lg" p-3 placeholder="Email">
        </div>
        <div class="password">
          <input type="password" class="text-input" w-80 border="solid gray-300 1" rounded="lg" p-3 placeholder="Password">
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 核心样式：脱离文档流 */
.modal-overlay {
  position: fixed; /* 关键：固定定位 */
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5); /* 半透明遮罩 */
  z-index: 9999; /* 保证在最上层 */
  display: flex;
  justify-content: center; /* 水平居中 */
  align-items: center; /* 垂直居中 */
}

.modal-content {
  background: white;
  padding: 20px;
  border-radius: 8px;
  min-width: 300px;
  max-width: 90%;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.close-btn {
  border: none;
  background: none;
  font-size: 20px;
  cursor: pointer;
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
