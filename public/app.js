console.log('Initializing DrawingApp...');

// Log Socket.IO connection status
const socket = io();
socket.on('connect', () => {
    console.log('Connected to server with ID:', socket.id);
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
});

class DrawingApp {
    constructor() {
        this.canvas = document.getElementById('drawing-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.socket = io();
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.history = [];
        this.undoneHistory = []; // Store undone actions for redo
        this.currentPath = [];
        this.currentTool = 'brush';
        this.currentColor = '#000000';
        this.brushSize = 5;
        this.userId = null;
        this.userColor = null;
        this.otherUsers = new Map();
        this.userCursors = new Map();

        this.initCanvas();
        this.setupEventListeners();
        this.setupSocketListeners();
    }

    initCanvas() {
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.ctx.lineJoin = 'round';
        this.ctx.lineCap = 'round';
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.offsetWidth;
        this.canvas.height = container.offsetHeight;
        this.redrawCanvas();
    }

    setupEventListeners() {
        // Mouse/Touch events
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
        
        // Touch events for mobile
        this.canvas.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        }, false);

        this.canvas.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        }, false);

        this.canvas.addEventListener('touchend', () => {
            const mouseEvent = new MouseEvent('mouseup', {});
            this.canvas.dispatchEvent(mouseEvent);
        }, false);

        // Tool buttons
        document.getElementById('brush').addEventListener('click', () => this.setTool('brush'));
        document.getElementById('eraser').addEventListener('click', () => this.setTool('eraser'));
        document.getElementById('clear').addEventListener('click', () => this.clearCanvas());
        document.getElementById('undo').addEventListener('click', () => this.undo());
        document.getElementById('redo').addEventListener('click', () => this.redo());
        
        // Color and size controls
        document.getElementById('color').addEventListener('input', (e) => {
            this.currentColor = e.target.value;
        });

        const brushSizeInput = document.getElementById('brushSize');
        const brushSizeValue = document.getElementById('brushSizeValue');
        brushSizeInput.addEventListener('input', (e) => {
            this.brushSize = parseInt(e.target.value);
            brushSizeValue.textContent = this.brushSize;
        });
    }

    setupSocketListeners() {
        this.socket.on('init', (data) => {
            this.userId = data.userId;
            this.userColor = data.userColor;
            this.otherUsers = new Map(data.users.map(user => [user.id, user]));
            this.history = data.drawingHistory || [];
            this.redrawCanvas();
            this.updateUsersList();
        });

        this.socket.on('userConnected', (user) => {
            this.otherUsers.set(user.id, user);
            this.updateUsersList();
        });

        this.socket.on('userDisconnected', (userId) => {
            this.otherUsers.delete(userId);
            this.removeCursor(userId);
            this.updateUsersList();
        });

        this.socket.on('drawing', (data) => {
            this.drawRemote(data);
        });

        this.socket.on('userCursorMove', (data) => {
            this.updateUserCursor(data);
        });

        this.socket.on('canvasCleared', () => {
            this.history = [];
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        });

        this.socket.on('updateHistory', (history) => {
            this.history = history;
            this.redrawCanvas();
        });
    }

    startDrawing(e) {
        this.isDrawing = true;
        [this.lastX, this.lastY] = [e.offsetX, e.offsetY];
        this.currentPath = [];
    }

    draw(e) {
        if (!this.isDrawing) {
            // Update cursor position for other users
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.socket.emit('cursorMove', { x, y });
            return;
        }

        const x = e.offsetX;
        const y = e.offsetY;

        // Draw locally
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(x, y);
        this.ctx.strokeStyle = this.currentTool === 'eraser' ? '#ffffff' : this.currentColor;
        this.ctx.lineWidth = this.brushSize;
        this.ctx.stroke();

        // Add to current path
        this.currentPath.push({
            x,
            y,
            color: this.currentTool === 'eraser' ? '#ffffff' : this.currentColor,
            size: this.brushSize
        });

        [this.lastX, this.lastY] = [x, y];
    }

    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            
            // Add the completed path to history
            if (this.currentPath.length > 0) {
                const pathData = {
                    points: [...this.currentPath],
                    userId: this.userId
                };
                
                // Add to local history
                this.history.push(pathData);
                
                // Send to server
                this.socket.emit('draw', pathData);
            }
        }
    }

    drawRemote(data) {
        const path = data.points;
        if (!path || path.length < 2) return;

        const userColor = this.otherUsers.get(data.userId)?.color || '#000000';
        
        this.ctx.beginPath();
        this.ctx.moveTo(path[0].x, path[0].y);
        
        for (let i = 1; i < path.length; i++) {
            this.ctx.lineTo(path[i].x, path[i].y);
            this.ctx.strokeStyle = path[i].color || userColor;
            this.ctx.lineWidth = path[i].size || 5;
            this.ctx.stroke();
        }
    }

    redrawCanvas() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Redraw all paths from history
        this.history.forEach(pathData => {
            this.drawRemote(pathData);
        });
    }

    updateUserCursor(data) {
        const { userId, position, color } = data;
        let cursor = this.userCursors.get(userId);
        
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.className = 'cursor';
            cursor.style.borderColor = color;
            cursor.style.color = color;
            document.body.appendChild(cursor);
            this.userCursors.set(userId, cursor);
        }
        
        cursor.style.left = `${position.x}px`;
        cursor.style.top = `${position.y}px`;
        
        // Update cursor label with user info
        const user = this.otherUsers.get(userId);
        if (user) {
            cursor.setAttribute('data-user', user.name || `User ${userId.slice(0, 4)}`);
        }
    }

    removeCursor(userId) {
        const cursor = this.userCursors.get(userId);
        if (cursor) {
            document.body.removeChild(cursor);
            this.userCursors.delete(userId);
        }
    }

    updateUsersList() {
        const usersList = document.getElementById('users-list');
        usersList.innerHTML = '';
        
        // Add current user
        this.addUserToList(this.userId, this.userColor, true);
        
        // Add other users
        this.otherUsers.forEach((user, userId) => {
            if (userId !== this.userId) {
                this.addUserToList(userId, user.color);
            }
        });
    }

    addUserToList(userId, color, isCurrentUser = false) {
        const usersList = document.getElementById('users-list');
        const userItem = document.createElement('div');
        userItem.className = 'user-item';
        
        const colorIndicator = document.createElement('div');
        colorIndicator.className = 'user-color';
        colorIndicator.style.backgroundColor = color;
        
        const userName = document.createElement('span');
        userName.textContent = isCurrentUser ? 'You' : `User ${userId.slice(0, 4)}`;
        
        userItem.appendChild(colorIndicator);
        userItem.appendChild(userName);
        usersList.appendChild(userItem);
    }

    setTool(tool) {
        this.currentTool = tool;
        
        // Update active button state
        document.querySelectorAll('.tools button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (tool === 'brush') {
            document.getElementById('brush').classList.add('active');
        } else if (tool === 'eraser') {
            document.getElementById('eraser').classList.add('active');
        }
    }

    clearCanvas() {
        if (confirm('Are you sure you want to clear the canvas? This will clear for all users.')) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.history = [];
            this.undoneHistory = [];
            this.socket.emit('clearCanvas');
            this.updateButtonStates();
        }
    }

    undo() {
        if (this.history.length > 0) {
            // Move the last action to undone history
            const lastAction = this.history.pop();
            this.undoneHistory.push(lastAction);
            
            // Update the canvas and notify other users
            this.socket.emit('undo');
            this.redrawCanvas();
            
            // Update the redo button state
            this.updateButtonStates();
        }
    }
    
    redo() {
        if (this.undoneHistory.length > 0) {
            // Move the last undone action back to history
            const lastUndone = this.undoneHistory.pop();
            this.history.push(lastUndone);
            
            // Update the canvas and notify other users
            this.socket.emit('draw', lastUndone);
            this.redrawCanvas();
            
            // Update the redo button state
            this.updateButtonStates();
        }
    }
    
    updateButtonStates() {
        // Enable/disable undo/redo buttons based on history
        document.getElementById('undo').disabled = this.history.length === 0;
        document.getElementById('redo').disabled = this.undoneHistory.length === 0;
    }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new DrawingApp();
    
    // Set brush as default active tool
    document.getElementById('brush').classList.add('active');
    
    // Prevent scrolling on touch devices
    document.body.addEventListener('touchmove', (e) => {
        if (e.target === app.canvas) {
            e.preventDefault();
        }
    }, { passive: false });
});
