<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onMounted } from 'vue'

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement

  // Dein bestehendes Theme-System
  root.setAttribute('data-theme', theme)

  // Bootstrap Theme System (damit Inputs/Card etc. automatisch passen)
  root.setAttribute('data-bs-theme', theme)
}

function toggleTheme() {
  const root = document.documentElement
  const current = root.getAttribute('data-theme')

  if (current === 'dark') {
    applyTheme('light')
    localStorage.setItem('theme', 'light')
  } else {
    applyTheme('dark')
    localStorage.setItem('theme', 'dark')
  }
}

onMounted(() => {
  const saved = (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  applyTheme(saved)
})
</script>

<template>
  <!-- Wrapper sorgt dafür, dass der Hintergrund wirklich full screen ist -->
  <div class="app-shell">
    <header class="top-bar">
      <button class="theme-toggle" @click="toggleTheme">🌓</button>
    </header>

    <main class="center-content">
      <h1 class="title">WhatToDo?</h1>
      <h2 class="subtitle">Einfach. Übersichtlich. Schnell.</h2>

      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* ─────────────────────────────────────────────
   Fullscreen Hintergrund (WICHTIG für Darkmode)
────────────────────────────────────────────── */
.app-shell {
  min-height: 100vh;
}

/* Wir nutzen dein data-theme Attribut weiter */
:global(html[data-theme='light']) {
  background: #ffffff;
}
:global(html[data-theme='dark']) {
  background: #0b0f14;
}

/* Body + #app sollen transparent sein, damit html-bg durchkommt */
:global(body),
:global(#app) {
  min-height: 100vh;
  background: transparent !important;
}

/* Textfarben */
:global(html[data-theme='light']) {
  color: #111;
}
:global(html[data-theme='dark']) {
  color: #f1f1f1;
}

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
  border: 1px solid var(--color-text, currentColor);
  padding: 0.4rem 0.6rem;
  font-size: 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  color: var(--color-text, currentColor);
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
  width: 100%;
  max-width: 1200px; /* vorher 700px -> jetzt deutlich größer */
  margin: 0 auto;
  text-align: center;
  padding: 2rem 1.5rem;
}

.title {
  font-size: 3rem;
  font-weight: 600;
  letter-spacing: -0.5px;
  margin-top: 2rem;
  margin-bottom: 0.5rem;
  font-family:
    -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif;
  animation: fadeIn 0.6s ease forwards;
  opacity: 0;
}

.subtitle {
  font-size: 1.2rem;
  font-weight: 300;
  color: var(--color-text, currentColor);
  opacity: 0.75;
  margin-bottom: 2.5rem;
  font-family:
    -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif;
  animation: fadeIn 0.9s ease forwards;
  opacity: 0;
}

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
