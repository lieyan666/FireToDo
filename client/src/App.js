import React, { useState, useEffect, useMemo, useCallback } from 'react';
import io from 'socket.io-client';
import {
  Container,
  Typography,
  List,
  TextField,
  Button,
  Paper,
  Checkbox,
  Box,
  IconButton,
  Tabs,
  Tab,
  Card,
  CardContent,
  Tooltip,
  Grid,
  CssBaseline,
  ThemeProvider,
} from '@mui/material';
import { Add, Delete, ClearAll, Brightness4, Brightness7 } from '@mui/icons-material';
import { getAppTheme } from './theme';

const API_URL = 'http://localhost:3001/api/todos';
const SOCKET_URL = 'http://localhost:3001';

const socket = io(SOCKET_URL);

function App() {
  const [todos, setTodos] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [filter, setFilter] = useState('all');
  const [colorMode, setColorMode] = useState(() => localStorage.getItem('colorMode') || 'light');

  const theme = useMemo(() => getAppTheme(colorMode), [colorMode]);

  useEffect(() => {
    // Listen for updates from the server
    socket.on('todos_updated', (updatedTodos) => {
      setTodos(updatedTodos);
    });

    // Clean up the socket connection when the component unmounts
    return () => {
      socket.off('todos_updated');
    };
  }, []);

  const handleApiCall = useCallback(async (url, options) => {
    // We don't need to handle the response here anymore because the socket will update us
    await fetch(url, options);
  }, []);

  const addTodo = () => {
    if (newTask.trim() === '') return;
    handleApiCall(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: newTask }),
    });
    setNewTask('');
  };

  const toggleTodo = (id, completed) => {
    handleApiCall(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !completed }),
    });
  };

  const deleteTodo = (id) => {
    handleApiCall(`${API_URL}/${id}`, { method: 'DELETE' });
  };

  const clearCompleted = () => {
    const completedTodos = todos.filter(todo => todo.completed);
    Promise.all(completedTodos.map(todo => handleApiCall(`${API_URL}/${todo.id}`, { method: 'DELETE' })));
  };

  const filteredTodos = useMemo(() => {
    switch (filter) {
      case 'active': return todos.filter((todo) => !todo.completed);
      case 'completed': return todos.filter((todo) => todo.completed);
      default: return todos;
    }
  }, [todos, filter]);

  const toggleColorMode = () => {
    const newMode = colorMode === 'light' ? 'dark' : 'light';
    setColorMode(newMode);
    localStorage.setItem('colorMode', newMode);
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return '...';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        <Paper elevation={4} sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ p: { xs: 2, md: 4 }, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Grid container alignItems="center" justifyContent="space-between">
              <Grid item>
                <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  FireToDo
                </Typography>
              </Grid>
              <Grid item>
                <Tooltip title={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}>
                  <IconButton onClick={toggleColorMode} color="inherit">
                    {colorMode === 'light' ? <Brightness4 /> : <Brightness7 />}
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
              Real-time task management
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="What needs to be done?"
                variant="filled"
                fullWidth
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTodo()}
              />
              <Button variant="contained" onClick={addTodo} aria-label="add" sx={{ px: 4 }}>
                <Add />
              </Button>
            </Box>
          </Box>

          <Box sx={{ borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: { xs: 1, md: 2 } }}>
            <Tabs value={filter} onChange={(e, v) => setFilter(v)} aria-label="todo filters">
              <Tab label={`All (${todos.length})`} value="all" />
              <Tab label={`Active (${todos.filter(t => !t.completed).length})`} value="active" />
              <Tab label={`Completed (${todos.filter(t => t.completed).length})`} value="completed" />
            </Tabs>
            <Tooltip title="Clear all completed tasks">
              <span>
                <IconButton onClick={clearCompleted} disabled={!todos.some(t => t.completed)}>
                  <ClearAll />
                </IconButton>
              </span>
            </Tooltip>
          </Box>

          <List sx={{ p: { xs: 1, md: 2 }, minHeight: 300, maxHeight: '60vh', overflowY: 'auto' }}>
            {filteredTodos.length > 0 ? (
              filteredTodos.map((todo) => (
                <Card key={todo.id} sx={{ mb: 2, borderRadius: 2 }} variant="outlined">
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, '&:last-child': { pb: 2 } }}>
                    <Checkbox edge="start" checked={todo.completed} onChange={() => toggleTodo(todo.id, todo.completed)} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body1" sx={{ textDecoration: todo.completed ? 'line-through' : 'none', color: todo.completed ? 'text.secondary' : 'text.primary' }}>
                        {todo.task}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {`Added: ${formatTimestamp(todo.createdAt)}`}
                      </Typography>
                    </Box>
                    <IconButton edge="end" aria-label="delete" onClick={() => deleteTodo(todo.id)}>
                      <Delete />
                    </IconButton>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 200 }}>
                <Typography color="text.secondary">
                  Your list is empty. Add a new task to get started!
                </Typography>
              </Box>
            )}
          </List>
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

export default App;