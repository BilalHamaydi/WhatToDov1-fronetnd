<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted } from 'vue'

function toggleTheme() {
  const root = document.documentElement
  const current = root.getAttribute("data-theme")

  if (current === "dark") {
    root.setAttribute("data-theme", "light")
    localStorage.setItem("theme", "light")
  } else {
    root.setAttribute("data-theme", "dark")
    localStorage.setItem("theme", "dark")
  }
}

onMounted(() => {
  const saved = localStorage.getItem("theme") || "light"
  document.documentElement.setAttribute("data-theme", saved)
})
</script>

<template>
  <header class="top-bar">
    <button class="theme-toggle" @click="toggleTheme">🌓</button>
  </header>

  <main class="center-content">
    <RouterView />
  </main>
</template>

<style scoped>
.top-bar {
  width: 100%;
  padding: 1rem;
  display: flex;
  justify-content: flex-start;
}

.theme-toggle {
  background: none;
  border: 1px solid var(--color-text);
  padding: 0.4rem 0.6rem;
  font-size: 1.2rem;
  border-radius: 6px;
  cursor: pointer;
  color: var(--color-text);
  transition: 0.3s;
}

.theme-toggle:hover {
  opacity: 0.7;
}

.center-content {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}
</style>
