<script setup lang="ts">
interface Props {
  showRetry?: boolean
}

withDefaults(defineProps<Props>(), {
  showRetry: false,
})

const emit = defineEmits<{
  retry: []
  details: []
}>()
</script>

<template>
  <div class="card-actions">
    <button
      v-if="showRetry"
      class="card-action card-action--ghost"
      type="button"
      @click="emit('retry')"
    >
      Retry
    </button>

    <button
      class="card-action card-action--primary"
      type="button"
      @click="emit('details')"
    >
      Details
    </button>
  </div>
</template>

<style scoped>
.card-actions {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.card-action {
  border-radius: 999px;
  padding: 0.72rem 1.05rem;
  cursor: pointer;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.card-action--ghost {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-main);
}

.card-action--primary {
  border: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(191, 226, 255, 0.86));
  color: #06152d;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.16);
}
</style>
