<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 1. Typ-Interface definieren
interface Todo {
  id: number;
  text: string;
  done: boolean;
}

// 2. State mit Typ verwenden!
const todos = ref<Todo[]>([])
const newTodo = ref('')
const loading = ref(false)
const error = ref('')

// Ersetze diese URL durch deine Render-Backend-URL!
const apiUrl = 'https://whattodov1.onrender.com/todos'

// 3. Laden der Todos beim Start
onMounted(loadTodos)

function loadTodos() {
  loading.value = true
  fetch(apiUrl)
    .then(response => {
      if (!response.ok) throw new Error('Backend nicht erreichbar')
      return response.json()
    })
    .then((data: Todo[]) => {
      todos.value = data
      error.value = ''
    })
    .catch(err => {
      error.value = 'Fehler: ' + err.message
    })
    .finally(() => {
      loading.value = false
    })
}

// 4. Hinzufügen
function addTodo() {
  const text = newTodo.value.trim()
  if (text) {
    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, done: false }),
    })
      .then(response => {
        if (!response.ok) throw new Error('Fehler beim Speichern');
        return response.json();
      })
      .then((todo: Todo) => {
        todos.value.push(todo);
        newTodo.value = '';
        error.value = '';
      })
      .catch(err => {
        error.value = 'Fehler: ' + err.message;
      });
  }
}


// 5. Löschen
function deleteTodo(id: number) {
  fetch(`${apiUrl}/${id}`, { method: 'DELETE' })
    .then(response => {
      if (!response.ok) throw new Error('Fehler beim Löschen');
      todos.value = todos.value.filter(t => t.id !== id);
      error.value = '';
    })
    .catch(err => {
      error.value = 'Fehler: ' + err.message;
    });
}




</script>

<template>
  <div class="todo-container">
    <h2>🗒️ Meine To-Do-Liste</h2>
    <div v-if="loading">Lade Aufgaben...</div>
    <div v-if="error" style="color:red">{{ error }}</div>

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
            <input type="checkbox" v-model="todo.done" />
          </td>
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
h2 { text-align: center; margin-bottom: 1rem; }
.input-row { display: flex; gap: 8px; margin-bottom: 1rem; }
input[type="text"] { flex: 1; padding: 6px 8px; border-radius: 6px; border: none; }
button {
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 10px;
  cursor: pointer;
  transition: background-color 0.2s;
}
button:hover { background-color: #45a049; }
.delete-btn { background-color: #e74c3c; }
.delete-btn:hover { background-color: #c0392b; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 6px; text-align: left; }
tr:nth-child(even) { background-color: #2a2a2a; }
.done { text-decoration: line-through; color: #aaa; }
</style>
