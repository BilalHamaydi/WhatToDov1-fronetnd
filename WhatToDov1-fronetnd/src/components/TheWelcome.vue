<script setup lang="ts">
import { ref } from 'vue'

const todos = ref([
  { id: 1, text: 'Einkaufen gehen', done: false },
  { id: 2, text: 'Vue lernen', done: true },
  { id: 3, text: 'Projekt starten', done: false },
])

const newTodo = ref('')

function addTodo() {
  const text = newTodo.value.trim()
  if (text) {
    todos.value.push({
      id: Date.now(),
      text,
      done: false,
    })
    newTodo.value = ''
  }
}

function deleteTodo(id: number) {
  todos.value = todos.value.filter(t => t.id !== id)
}
</script>

<template>
  <div class="todo-container">
    <h2>🗒️ Meine To-Do-Liste</h2>

    <div class="input-row">
      <input
        v-model="newTodo"
        placeholder="Neue Aufgabe eingeben..."
        @keyup.enter="addTodo"
      />
      <button @click="addTodo">Hinzufügen</button>
    </div>

    <table>
      <thead>
        <tr>
          <th>Erledigt</th>
          <th>Aufgabe</th>
          <th>Aktionen</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="todo in todos" :key="todo.id">
          <td>
            <!-- v-model bindet automatisch an todo.done -->
            <input type="checkbox" v-model="todo.done" />
          </td>
          <!-- Dynamische Klasse für Durchstreichen -->
          <td :class="{ done: todo.done }">{{ todo.text }}</td>
          <td>
            <button class="delete-btn" @click="deleteTodo(todo.id)">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.todo-container {
  width: 100%;
  max-width: 500px;
  margin: auto;
  background: #1e1e1e;
  color: white;
  padding: 1rem;
  border-radius: 10px;
  box-shadow: 0 0 10px #00000044;
}

h2 {
  text-align: center;
  margin-bottom: 1rem;
}

.input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 1rem;
}

input[type="text"] {
  flex: 1;
  padding: 6px 8px;
  border-radius: 6px;
  border: none;
}

button {
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #45a049;
}

.delete-btn {
  background-color: #e74c3c;
}

.delete-btn:hover {
  background-color: #c0392b;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 6px;
  text-align: left;
}

tr:nth-child(even) {
  background-color: #2a2a2a;
}

/* Durchgestrichene Aufgaben */
.done {
  text-decoration: line-through;
  color: #aaa;
}
</style>
