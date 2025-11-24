<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterView } from 'vue-router'

const darkMode = ref(false)

// Theme per Button setzen
function toggleTheme() {
  darkMode.value = !darkMode.value
}

// Theme dynamisch auf <html> anwenden
watch(darkMode, (isDark) => {
  document.documentElement.classList.toggle('dark', isDark)
})
</script>

<template>
  <button @click="toggleTheme"
    style="
      position: fixed;
      top: 24px;
      left: 24px;
      z-index: 10;
      background: #f2f2f2;
      color: #222;
      border: none;
      border-radius: 8px;
      padding: 10px 18px;
      font-size: 1rem;
      box-shadow: 0 2px 8px #0001;
      cursor: pointer;
      transition: background 0.4s, color 0.4s;
    ">
    {{ darkMode ? '☀️ Lightmode' : '🌙 Darkmode' }}
  </button>

  <main class="centered-content">
    <RouterView />
  </main>
</template>

<style scoped>
.centered-content {
  min-height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  /* Extra Padding für große Card */
}
</style>
