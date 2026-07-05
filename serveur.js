const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.txt': 'text/plain'
};

http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  // Alias versionnés (cache-busting) réécrits en prod par vercel.json — reproduit ici pour le dev local
  urlPath = urlPath.replace(/^\/(css|js)\/app-r\d+\.(css|js)$/, '/$1/app.$2');

  const filePath = path.join(ROOT, urlPath);
  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 - Fichier non trouvé');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log('Serveur Creatis demarre sur http://localhost:' + PORT);
  console.log('- Landing page : http://localhost:' + PORT + '/index.html');
  console.log('- Connexion    : http://localhost:' + PORT + '/auth.html');
  console.log('- Application  : http://localhost:' + PORT + '/app.html');
  console.log('Ctrl+C pour arreter');
});
