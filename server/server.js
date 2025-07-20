const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Allow requests from our React client
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());

// --- Helper Functions ---
const readData = () => {
  try {
    const rawData = fs.readFileSync(DB_PATH);
    return JSON.parse(rawData);
  } catch (error) {
    // If file doesn't exist, create it with default structure
    if (error.code === 'ENOENT') {
      const defaultData = { todos: [] };
      writeData(defaultData);
      return defaultData;
    }
    throw error;
  }
};

const writeData = (data) => {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
};

const getSortedTodos = () => {
  const data = readData();
  return data.todos.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// --- Socket.IO Connection ---
io.on('connection', (socket) => {
  console.log('a user connected');
  // Send the current list of todos to the new client
  socket.emit('todos_updated', getSortedTodos());

  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

// --- API Endpoints ---
app.get('/api/todos', (req, res) => {
  res.json(getSortedTodos());
});

app.post('/api/todos', (req, res) => {
  const data = readData();
  const newTodo = {
    id: Date.now(),
    task: req.body.task,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  data.todos.push(newTodo);
  writeData(data);
  // Broadcast the update to all clients
  io.emit('todos_updated', getSortedTodos());
  res.status(201).json(newTodo);
});

app.put('/api/todos/:id', (req, res) => {
  const data = readData();
  const todoId = parseInt(req.params.id);
  const todoIndex = data.todos.findIndex((todo) => todo.id === todoId);

  if (todoIndex === -1) {
    return res.status(404).json({ message: 'Todo not found' });
  }

  data.todos[todoIndex] = { ...data.todos[todoIndex], ...req.body };
  writeData(data);
  // Broadcast the update
  io.emit('todos_updated', getSortedTodos());
  res.json(data.todos[todoIndex]);
});

app.delete('/api/todos/:id', (req, res) => {
  const data = readData();
  const todoId = parseInt(req.params.id);
  const filteredTodos = data.todos.filter((todo) => todo.id !== todoId);

  if (data.todos.length === filteredTodos.length) {
    return res.status(404).json({ message: 'Todo not found' });
  }

  data.todos = filteredTodos;
  writeData(data);
  // Broadcast the update
  io.emit('todos_updated', getSortedTodos());
  res.status(204).send();
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});