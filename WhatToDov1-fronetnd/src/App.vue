<!-- App.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { RouterView } from 'vue-router'

// Darkmode var + Umschalter
const darkMode = ref(false)

function toggleTheme() {
  darkMode.value = !darkMode.value
  document.documentElement.classList.toggle('dark', darkMode.value)
}
</script>

<template>
  <!-- Theme-Button oben links -->
  <button @click="toggleTheme"
          style="position:fixed;top:20px;left:20px;z-index:100;background:#eee;border-radius:6px;padding:7px 12px;">
    {{ darkMode ? '☀️ Lightmode' : '🌙 Darkmode' }}
  </button>

  <!-- Zentrierte To-Do-Liste -->
  <div style="display:flex;justify-content:center;align-items:center;min-height:100vh;">
    <RouterView />
  </div>
</template>

<style scoped>
/* Kein spezieller Style nötig, alles basis in main.css/base.css */
</style>
