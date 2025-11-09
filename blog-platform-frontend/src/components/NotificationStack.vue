<template>
  <div class="toast-stack" aria-live="polite" aria-atomic="true">
    <transition-group name="toast" tag="div">
      <article v-for="toast in notifications" :key="toast.id" class="toast" :class="toast.type">
        <span class="toast-indicator" aria-hidden="true"></span>
        <p class="toast-message">{{ toast.message }}</p>
        <button class="toast-close" type="button" @click="dismiss(toast.id)" aria-label="Đóng thông báo">
          <Icon name="close" size="16" stroke="2.2" />
        </button>
      </article>
    </transition-group>
  </div>
</template>

<script setup>
import Icon from './Icon.vue'
import { dismissNotification, useNotifications } from '../stores/notifications'

const notifications = useNotifications()
const dismiss = (id) => dismissNotification(id)
</script>

<style scoped>
.toast-stack {
  position: fixed;
  top: 24px;
  right: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 2000;
  pointer-events: none;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
}

.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.toast {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 14px;
  min-width: 240px;
  max-width: 320px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 18px 45px -25px rgba(15, 23, 42, 0.35);
  border: 1px solid rgba(148, 163, 184, 0.28);
  pointer-events: auto;
}

.toast-indicator {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--brand-700, #8b5cf6);
  box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.18);
}

.toast.success .toast-indicator {
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.18);
}

.toast.error .toast-indicator {
  background: #ef4444;
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.18);
}

.toast-message {
  margin: 0;
  font-size: 0.95rem;
  color: rgba(15, 23, 42, 0.85);
}

.toast-close {
  border: 0;
  background: rgba(148, 163, 184, 0.16);
  color: rgba(15, 23, 42, 0.65);
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.18s ease, transform 0.18s ease;
}

.toast-close:hover {
  background: rgba(148, 163, 184, 0.24);
  transform: scale(1.05);
}

@media (max-width: 640px) {
  .toast-stack {
    top: auto;
    bottom: 24px;
    right: 16px;
    left: 16px;
  }

  .toast {
    max-width: none;
  }
}
</style>
