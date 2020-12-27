'use strict';

const 
   http = require('http'),
   fs = require('fs'),
   path = require('path');

const CLIENT_PATH = path.join(process.cwd(), './client');

const MIME_TYPES = {
   html: 'text/html; charset=UTF-8',
   js: 'application/javascript; charset=UTF-8',
   css: 'text/css',
   png: 'image/png',
   ico: 'image/x-icon',
   svg: 'image/svg+xml',
   plain: 'text/plain',
};

const ROUTE_LIST = [
   '/',
];

const serveFile = name => {
   const filePath = path.join(CLIENT_PATH, name);
   if (!filePath.startsWith(CLIENT_PATH)) {
      console.log(`Can't be served: ${name}`);
      return null;
   };
   try {
      fs.accessSync(filePath);
      console.log(`Served: ${name}`);
      return fs.createReadStream(filePath); 
   } catch (err) {
      console.error(`Path isn't valid ${filePath}`);
   };
};

http.createServer((req, res) => {
   const { url } = req;
   const name = ROUTE_LIST.includes(url) ? '/index.html' : url;
   const fileExt = path.extname(name).substring(1);
   const mimeType = MIME_TYPES[fileExt] || MIME_TYPES.plain;
   res.writeHead(200, { 'Content-Type': mimeType });
   const stream = serveFile(name);
   if (stream) stream.pipe(res);
}).listen(8000, () => console.log('server started'));
