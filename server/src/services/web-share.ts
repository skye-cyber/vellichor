// import path from 'path';
import { app } from '../app';

app.get('/share/:id', (req, res) => {
  const fileId = req.params.id;
  // Serve an HTML page that uses WebRTC to connect back to the mobile app
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Vellichor Web Share</title>
    </head>
    <body>
      <h1>Receiving file...</h1>
      <div id="status">Connecting...</div>
      <script>
        const fileId = "${fileId}";
        // WebRTC signaling and file download logic
      </script>
    </body>
    </html>
  `;
  res.send(html);
});

export default app;
