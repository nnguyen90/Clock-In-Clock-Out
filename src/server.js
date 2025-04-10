// src/server.js

require('dotenv').config();

const app = require('./app');
const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
}); 

server.on('error', (err) => {
  console.error('Server error:', err);
});

module.exports = server;
