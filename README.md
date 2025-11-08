# Collaborative Drawing App

A real-time collaborative drawing application where multiple users can draw simultaneously on the same canvas. Built with Node.js, Socket.IO, and HTML5 Canvas.

## Features

- 🎨 Real-time collaborative drawing
- ✏️ Multiple tools: Brush, Eraser
- 🎨 Color picker and brush size adjustment
- 👥 See other users' cursors in real-time
- ↩️ Undo/Redo functionality
- 🖥️ Responsive design (works on desktop and mobile)

## Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/satvikk0000/canvas_app_prject.git
   cd canvas_app_prject
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   npm start
   ```

4. **Open in browser**
   - Open `http://localhost:3000` in your web browser

## Testing with Multiple Users

1. **On the same computer**
   - Open multiple browser windows in incognito/private mode
   - Navigate to `http://localhost:3000` in each window
   - Each window will be treated as a different user

2. **On different devices on the same network**
   - Find your computer's local IP address:
     - Windows: Open Command Prompt and type `ipconfig`
     - Mac/Linux: Open Terminal and type `ifconfig`
   - Other users should navigate to `http://YOUR_LOCAL_IP:3000`

3. **Over the internet** (using ngrok)
   - Install ngrok: `npm install -g ngrok`
   - Run `ngrok http 3000`
   - Share the ngrok URL (e.g., `https://abc123.ngrok.io`) with others

## Deployment

### Deploy to Render (Recommended)

1. Click the button below to deploy to Render:

   [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/satvikk0000/canvas_app_prject)

2. Or manually:
   - Create a new Web Service on Render
   - Connect your GitHub repository
   - Set the following:
     - Build Command: `npm install`
     - Start Command: `node server.js`
   - Deploy!

## Known Limitations

- Drawings are stored in memory and will be lost when the server restarts
- No user authentication (anyone with the link can draw)
- Limited to ~100 concurrent users (Socket.IO default)
- Mobile touch support could be improved
- No persistent storage of drawings

## Browser Support

- Chrome (recommended)
- Firefox
- Edge
- Safari (limited testing)
- Mobile browsers (basic support)

## Time Spent

- Initial development: ~8 hours
- Testing and bug fixes: ~3 hours
- Documentation: ~1 hour
- **Total: ~12 hours**

## Contributing

Feel free to submit issues and enhancement requests. Pull requests are welcome!

## License

This project is open source and available under the MIT License.
