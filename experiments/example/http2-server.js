const http2 = require('http2');
const fs = require('fs');

const server = http2.createServer();
server.on('error', (err) => console.error(err));
server.on('stream', (stream, headers) => {
  // stream is a Duplex
//   stream.respond({
//     'content-type': 'text/html',
//     ':status': 200
//   });
//   stream.end('<h1>Hello World</h1>');
    console.log('Got stream', headers)
    stream.pipe(process.stdout)
});

server.listen(8080);