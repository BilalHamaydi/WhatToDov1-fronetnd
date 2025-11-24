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
    <h1 class="title">WhatToDo?</h1>
    <h2 class="subtitle">Einfach. Übersichtlich. Schnell.</h2>

    <RouterView />
  </main>
</template>

<style scoped>
/* ─────────────────────────────────────────────
   Oberer Bereich (Dark Mode Button)
────────────────────────────────────────────── */
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
  border-radius: 8px;
  cursor: pointer;
  color: var(--color-text);
  transition: 0.25s ease;
  font-weight: 500;
}

.theme-toggle:hover {
  opacity: 0.7;
}

/* ─────────────────────────────────────────────
   Apple-Style Heading + Main Wrapper
────────────────────────────────────────────── */
.center-content {
  max-width: 700px;
  margin: 0 auto;
  text-align: center;
  padding: 2rem 1.5rem;
}

/* San-Francisco-ähnliche Optik: clean, dünn */
.title {
  font-size: 3rem;
  font-weight: 600;
  letter-spacing: -0.5px;
  margin-top: 2rem;
  margin-bottom: 0.5rem;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display",
    "Helvetica Neue", Arial, sans-serif;
  animation: fadeIn 0.6s ease forwards;
  opacity: 0;
}

.subtitle {
  font-size: 1.2rem;
  font-weight: 300;
  color: var(--color-text);
  opacity: 0.75;
  margin-bottom: 2.5rem;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text",
    "Helvetica Neue", Arial, sans-serif;
  animation: fadeIn 0.9s ease forwards;
  opacity: 0;
}

/* Leichter, cleaner Fade-In */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
