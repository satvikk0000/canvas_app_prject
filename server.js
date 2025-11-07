const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static('public'));

const users = new Map();
const drawingHistory = [];

io.on('connection', (socket) => {
  console.log('New client connected');
  const userId = socket.id;
  const userColor = `#${Math.floor(Math.random()*16777215).toString(16)}`;
  
  users.set(userId, { id: userId, color: userColor });
  
  // Send current users and drawing history to the new user
  socket.emit('init', { 
    userId, 
    userColor, 
    users: Array.from(users.values()),
    drawingHistory 
  });
  
  // Notify other users about the new user
  socket.broadcast.emit('userConnected', { id: userId, color: userColor });

  // Handle drawing events
  socket.on('draw', (data) => {
    // Add to history
    drawingHistory.push({ ...data, userId });
    // Broadcast to all other clients
    socket.broadcast.emit('drawing', { ...data, userId });
  });

  // Handle cursor movement
  socket.on('cursorMove', (position) => {
    socket.broadcast.emit('userCursorMove', { 
      userId, 
      position,
      color: userColor
    });
  });

  // Handle clear canvas
  socket.on('clearCanvas', () => {
    drawingHistory.length = 0; // Clear history
    io.emit('canvasCleared');
  });

  // Handle undo
  socket.on('undo', () => {
    if (drawingHistory.length > 0) {
      drawingHistory.pop();
      io.emit('updateHistory', drawingHistory);
    }
  });

  // Handle redo (handled client-side, but we need to broadcast the redrawn action)
  socket.on('draw', (data) => {
    // Add to history
    drawingHistory.push(data);
    // Broadcast to all other clients
    socket.broadcast.emit('drawing', data);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    users.delete(userId);
    io.emit('userDisconnected', userId);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
