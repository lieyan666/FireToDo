import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Fade,
  Slide,
  Snackbar,
  Alert,
  LinearProgress,
  Chip,
  Divider,
  Badge,
} from '@mui/material';
import { 
  Add, 
  Delete, 
  ClearAll, 
  Brightness4, 
  Brightness7, 
  CheckCircle,
  RadioButtonUnchecked,
  Schedule,
  Done,
  FilterList,
  Wifi,
  WifiOff,
  Info,
} from '@mui/icons-material';
import { getAppTheme } from './theme';

const API_URL = 'http://localhost:3001/api/todos';
const SOCKET_URL = 'http://localhost:3001';

const socket = io(SOCKET_URL);

function App() {
  const [todos, setTodos] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [filter, setFilter] = useState('all');
  const [colorMode, setColorMode] = useState(() => localStorage.getItem('colorMode') || 'light');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });
  const [searchTerm, setSearchTerm] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  const [appVersion] = useState('0.1.0');
  const inputRef = useRef(null);

  const theme = useMemo(() => getAppTheme(colorMode), [colorMode]);

  useEffect(() => {
    // Listen for updates from the server
    socket.on('todos_updated', (updatedTodos) => {
      setTodos(updatedTodos);
    });

    // Listen for connection status changes
    socket.on('connect', () => {
      setSocketConnected(true);
      setNotification({ open: true, message: 'Connected to server', severity: 'success' });
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
      setNotification({ open: true, message: 'Disconnected from server', severity: 'warning' });
    });

    socket.on('connect_error', () => {
      setSocketConnected(false);
      setNotification({ open: true, message: 'Connection failed', severity: 'error' });
    });

    // Set initial connection status
    setSocketConnected(socket.connected);

    // Clean up the socket connection when the component unmounts
    return () => {
      socket.off('todos_updated');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, []);

  const handleApiCall = useCallback(async (url, options, successMessage) => {
    try {
      setLoading(true);
      const response = await fetch(url, options);
      if (!response.ok) throw new Error('Network response was not ok');
      if (successMessage) {
        setNotification({ open: true, message: successMessage, severity: 'success' });
      }
    } catch (error) {
      setNotification({ open: true, message: 'Operation failed. Please try again.', severity: 'error' });
      console.error('API call failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addTodo = useCallback(() => {
    if (newTask.trim() === '') {
      setNotification({ open: true, message: 'Please enter a task', severity: 'warning' });
      return;
    }
    handleApiCall(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: newTask.trim() }),
    }, 'Task added successfully!');
    setNewTask('');
    inputRef.current?.focus();
  }, [newTask, handleApiCall]);

  const toggleTodo = useCallback((id, completed) => {
    handleApiCall(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !completed }),
    }, completed ? 'Task marked as pending' : 'Task completed!');
  }, [handleApiCall]);

  const deleteTodo = useCallback((id) => {
    handleApiCall(`${API_URL}/${id}`, { method: 'DELETE' }, 'Task deleted successfully!');
  }, [handleApiCall]);

  const clearCompleted = useCallback(() => {
    const completedTodos = todos.filter(todo => todo.completed);
    if (completedTodos.length === 0) {
      setNotification({ open: true, message: 'No completed tasks to clear', severity: 'info' });
      return;
    }
    Promise.all(completedTodos.map(todo => 
      handleApiCall(`${API_URL}/${todo.id}`, { method: 'DELETE' })
    )).then(() => {
      setNotification({ open: true, message: `${completedTodos.length} completed tasks cleared!`, severity: 'success' });
    });
  }, [todos, handleApiCall]);

  const filteredTodos = useMemo(() => {
    let filtered = todos;
    
    // Apply status filter
    switch (filter) {
      case 'active': 
        filtered = filtered.filter((todo) => !todo.completed);
        break;
      case 'completed': 
        filtered = filtered.filter((todo) => todo.completed);
        break;
      default: 
        break;
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(todo => 
        todo.task.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered;
  }, [todos, filter, searchTerm]);

  const toggleColorMode = useCallback(() => {
    const newMode = colorMode === 'light' ? 'dark' : 'light';
    setColorMode(newMode);
    localStorage.setItem('colorMode', newMode);
    setNotification({ open: true, message: `Switched to ${newMode} mode`, severity: 'info' });
  }, [colorMode]);

  const formatTimestamp = useCallback((isoString) => {
    if (!isoString) return '...';
    const date = new Date(isoString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  }, []);
  
  const handleCloseNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);
  
  const completedCount = useMemo(() => todos.filter(t => t.completed).length, [todos]);
  const activeCount = useMemo(() => todos.filter(t => !t.completed).length, [todos]);
  const completionPercentage = useMemo(() => 
    todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0, 
    [todos.length, completedCount]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
        <Fade in timeout={800}>
          <Paper elevation={4} sx={{ borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
            {loading && (
              <LinearProgress 
                sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  zIndex: 1000 
                }} 
              />
            )}
            
            <Box sx={{ p: { xs: 2, md: 4 }, borderBottom: `1px solid ${theme.palette.divider}` }}>
              <Grid container alignItems="center" justifyContent="space-between">
                <Grid item>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography 
                      variant="h3" 
                      component="h1" 
                      sx={{ 
                        fontWeight: 'bold', 
                        color: 'primary.main',
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      🔥 FireToDo
                    </Typography>
                    <Tooltip title={`Version ${appVersion}`}>
                      <Chip 
                        icon={<Info />} 
                        label={`v${appVersion}`} 
                        size="small" 
                        variant="outlined"
                        sx={{ 
                          borderColor: 'primary.main',
                          color: 'primary.main',
                          '& .MuiChip-icon': {
                            color: 'primary.main'
                          }
                        }}
                      />
                    </Tooltip>
                  </Box>
                </Grid>
                <Grid item>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title={socketConnected ? 'Connected to server' : 'Disconnected from server'}>
                      <Badge 
                        color={socketConnected ? 'success' : 'error'}
                        variant="dot"
                        sx={{
                          '& .MuiBadge-badge': {
                            animation: socketConnected ? 'none' : 'pulse 2s infinite'
                          }
                        }}
                      >
                        <IconButton 
                          size="small" 
                          sx={{ 
                            color: socketConnected ? 'success.main' : 'error.main',
                            cursor: 'default'
                          }}
                        >
                          {socketConnected ? <Wifi /> : <WifiOff />}
                        </IconButton>
                      </Badge>
                    </Tooltip>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: socketConnected ? 'success.main' : 'error.main',
                        fontWeight: 500,
                        display: { xs: 'none', sm: 'block' }
                      }}
                    >
                      {socketConnected ? 'Online' : 'Offline'}
                    </Typography>
                    <Tooltip title={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`}>
                      <IconButton onClick={toggleColorMode} color="inherit" size="large">
                        {colorMode === 'light' ? <Brightness4 /> : <Brightness7 />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Grid>
              </Grid>
              
              <Box sx={{ mt: 2, mb: 3 }}>
                <Typography variant="subtitle1" color="text.secondary">
                  Real-time task management with style
                </Typography>
                
                {todos.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Progress: {completionPercentage}%
                      </Typography>
                      <Chip 
                        icon={<Done />} 
                        label={`${completedCount}/${todos.length}`} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={completionPercentage} 
                      sx={{ 
                        height: 8, 
                        borderRadius: 4,
                        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                      }} 
                    />
                  </Box>
                )}
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    inputRef={inputRef}
                    label="What needs to be done?"
                    variant="filled"
                    fullWidth
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                    disabled={loading}
                    sx={{
                      '& .MuiFilledInput-root': {
                        borderRadius: 2,
                        '&:hover': {
                          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)'
                        }
                      }
                    }}
                  />
                  <Button 
                    variant="contained" 
                    onClick={addTodo} 
                    disabled={loading || !newTask.trim()}
                    aria-label="add" 
                    sx={{ 
                      px: 4, 
                      borderRadius: 2,
                      minWidth: 'auto',
                      background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                      '&:hover': {
                        background: `linear-gradient(45deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                      }
                    }}
                  >
                    <Add />
                  </Button>
                </Box>
                
                {todos.length > 0 && (
                  <TextField
                    label="Search tasks..."
                    variant="outlined"
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <FilterList sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2
                      }
                    }}
                  />
                )}
              </Box>
            </Box>

            <Box sx={{ 
              borderBottom: `1px solid ${theme.palette.divider}`, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              px: { xs: 1, md: 2 },
              py: 1
            }}>
              <Tabs 
                value={filter} 
                onChange={(e, v) => setFilter(v)} 
                aria-label="todo filters"
                sx={{
                  '& .MuiTab-root': {
                    borderRadius: 2,
                    mx: 0.5,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'
                    }
                  }
                }}
              >
                <Tab 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography>All</Typography>
                      <Chip label={todos.length} size="small" color="default" />
                    </Box>
                  } 
                  value="all" 
                />
                <Tab 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Schedule fontSize="small" />
                      <Typography>Active</Typography>
                      <Chip label={activeCount} size="small" color="warning" />
                    </Box>
                  } 
                  value="active" 
                />
                <Tab 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle fontSize="small" />
                      <Typography>Completed</Typography>
                      <Chip label={completedCount} size="small" color="success" />
                    </Box>
                  } 
                  value="completed" 
                />
              </Tabs>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                {searchTerm && (
                  <Chip 
                    label={`${filteredTodos.length} found`} 
                    size="small" 
                    color="info" 
                    onDelete={() => setSearchTerm('')}
                  />
                )}
                <Tooltip title="Clear all completed tasks">
                  <span>
                    <IconButton 
                      onClick={clearCompleted} 
                      disabled={!todos.some(t => t.completed) || loading}
                      sx={{
                        borderRadius: 2,
                        '&:hover': {
                          backgroundColor: theme.palette.error.main + '20'
                        }
                      }}
                    >
                      <ClearAll />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>

            <List sx={{ 
              p: { xs: 1, md: 2 }, 
              minHeight: 300, 
              maxHeight: '60vh', 
              overflowY: 'auto',
              '&::-webkit-scrollbar': {
                width: 8
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                borderRadius: 4
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: theme.palette.primary.main,
                borderRadius: 4,
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark
                }
              }
            }}>
              {filteredTodos.length > 0 ? (
                filteredTodos.map((todo, index) => (
                  <Slide 
                    key={todo.id} 
                    direction="up" 
                    in 
                    timeout={300 + index * 100}
                    style={{ transitionDelay: `${index * 50}ms` }}
                  >
                    <Card 
                      sx={{ 
                        mb: 2, 
                        borderRadius: 3,
                        transition: 'all 0.3s ease',
                        border: `1px solid ${theme.palette.divider}`,
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: theme.shadows[4],
                          borderColor: theme.palette.primary.main + '40'
                        },
                        ...(todo.completed && {
                          opacity: 0.7,
                          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
                        })
                      }} 
                      variant="outlined"
                    >
                      <CardContent sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2, 
                        '&:last-child': { pb: 2 },
                        py: 2
                      }}>
                        <Checkbox 
                          edge="start" 
                          checked={todo.completed} 
                          onChange={() => toggleTodo(todo.id, todo.completed)}
                          disabled={loading}
                          icon={<RadioButtonUnchecked />}
                          checkedIcon={<CheckCircle />}
                          sx={{
                            color: theme.palette.primary.main,
                            '&.Mui-checked': {
                              color: theme.palette.success.main
                            },
                            '& .MuiSvgIcon-root': {
                              fontSize: 24
                            }
                          }}
                        />
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              textDecoration: todo.completed ? 'line-through' : 'none', 
                              color: todo.completed ? 'text.secondary' : 'text.primary',
                              fontWeight: todo.completed ? 400 : 500,
                              transition: 'all 0.3s ease',
                              wordBreak: 'break-word'
                            }}
                          >
                            {todo.task}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Schedule fontSize="small" sx={{ color: 'text.secondary', fontSize: 16 }} />
                            <Typography variant="caption" color="text.secondary">
                              {formatTimestamp(todo.createdAt)}
                            </Typography>
                            {todo.completed && (
                              <Chip 
                                label="Completed" 
                                size="small" 
                                color="success" 
                                variant="outlined"
                                sx={{ ml: 1, height: 20 }}
                              />
                            )}
                          </Box>
                        </Box>
                        <Tooltip title="Delete task">
                          <IconButton 
                            edge="end" 
                            aria-label="delete" 
                            onClick={() => deleteTodo(todo.id)}
                            disabled={loading}
                            sx={{
                              color: 'text.secondary',
                              borderRadius: 2,
                              '&:hover': {
                                color: theme.palette.error.main,
                                backgroundColor: theme.palette.error.main + '20'
                              }
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </CardContent>
                    </Card>
                  </Slide>
                ))
              ) : (
                <Fade in timeout={600}>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100%', 
                    minHeight: 200,
                    textAlign: 'center',
                    py: 4
                  }}>
                    <Box sx={{ 
                      fontSize: 64, 
                      mb: 2,
                      opacity: 0.5,
                      filter: 'grayscale(1)'
                    }}>
                      {searchTerm ? '🔍' : filter === 'completed' ? '✅' : filter === 'active' ? '⏳' : '📝'}
                    </Box>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                      {searchTerm 
                        ? 'No tasks found' 
                        : filter === 'completed' 
                          ? 'No completed tasks yet' 
                          : filter === 'active'
                            ? 'No active tasks'
                            : 'Your list is empty'
                      }
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm 
                        ? 'Try adjusting your search terms'
                        : 'Add a new task to get started!'
                      }
                    </Typography>
                  </Box>
                </Fade>
              )}
            </List>
            
            {/* Status Bar */}
            <Box sx={{ 
              borderTop: `1px solid ${theme.palette.divider}`,
              px: { xs: 2, md: 3 },
              py: 1,
              backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'
            }}>
              <Grid container alignItems="center" justifyContent="space-between">
                <Grid item>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      FireToDo v{appVersion}
                    </Typography>
                    <Divider orientation="vertical" flexItem sx={{ height: 16 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                       {socketConnected ? (
                         <Wifi fontSize="small" color="success" />
                       ) : (
                         <WifiOff 
                           fontSize="small" 
                           color="error" 
                           sx={{ 
                             animation: 'pulse 2s infinite',
                             '@keyframes pulse': {
                               '0%': { opacity: 1 },
                               '50%': { opacity: 0.5 },
                               '100%': { opacity: 1 }
                             }
                           }} 
                         />
                       )}
                       <Typography variant="caption" color={socketConnected ? 'success.main' : 'error.main'}>
                         {socketConnected ? 'Real-time sync active' : 'Connection lost'}
                       </Typography>
                     </Box>
                  </Box>
                </Grid>
                <Grid item>
                  <Typography variant="caption" color="text.secondary">
                    {todos.length > 0 && `${todos.length} task${todos.length !== 1 ? 's' : ''} total`}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
            
            <Snackbar
              open={notification.open}
              autoHideDuration={4000}
              onClose={handleCloseNotification}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
              <Alert 
                onClose={handleCloseNotification} 
                severity={notification.severity}
                variant="filled"
                sx={{ borderRadius: 2 }}
              >
                {notification.message}
              </Alert>
            </Snackbar>
          </Paper>
        </Fade>
      </Container>
    </ThemeProvider>
  );
}

export default App;