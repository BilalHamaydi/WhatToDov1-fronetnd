<script setup lang="ts">
import WelcomeItem from './WelcomeItem.vue'
import DocumentationIcon from './icons/IconDocumentation.vue'
import ToolingIcon from './icons/IconTooling.vue'
import EcosystemIcon from './icons/IconEcosystem.vue'
import CommunityIcon from './icons/IconCommunity.vue'
import SupportIcon from './icons/IconSupport.vue'

const movies = [
  { id: 1, title: "Demon Slayer: Kimetsu no Yaiba Infinity Castle", year: 2025 , genre: "Anime/Action/Adventure/Fantasy" },
  { id: 2, title: "Chainsaw Man - The Movie: Reze Arc", year: 2025 , genre: "Anime/Action/Fantasy" },
  { id: 3, title: "Deadpool & Wolverine", year: 2024 , genre: "Action/Comedy" },
];
</script>

<template>
  <div>
    <h2> My Movie Watchlist</h2>

    <table>
      <thead>
        <tr>
          <th>Title</th>
          <th>Year</th>
          <th>Genre</th>
        </tr>
      </thead>

      <tbody>
        <!-- v-for-Schleife -->
        <tr v-for="m in movies" :key="m.id">
          <td>{{ m.title }}</td>
          <td>{{ m.year }}</td>
          <td>{{ m.genre }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  border-bottom: 1px solid #ccc;
  padding: 6px;
  text-align: left;
}
thead {
  background-color: #1e1e1e;
}
</style>
