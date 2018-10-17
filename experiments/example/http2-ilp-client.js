const { createHttp2Connection }  = require('../build/lib/http2-ilp')
const loader = require('ilp-module-loader')

const client = createHttp2Connection({
  destinationAccount: 'private.moneyd.local.v97jNf-n9HlqAAD9bQwShuULCsbS4hhiLXaMXr9zVk0.GQN-ESxS9pFoUp44DVFTvjoz',
  sharedSecret: Buffer.from('6a 22 8a 78 95 f1 86 4a 5d 87 6f ba 4c 6f dd 6b 0d 21 a1 08 e3 b2 a7 e8 a3 ce 2f 13 41 f9 09 1e', 'hex'),
  plugin: loader.createPlugin()
})

client.on('error', (err) => console.error(err));

const req = client.request({ ':path': '/' });
req.on('response', (headers, flags) => {
  for (const name in headers) {
    console.log(`${name}: ${headers[name]}`);
  }
});

req.setEncoding('utf8');
let data = '';
req.on('data', (chunk) => { data += chunk; });
req.on('end', () => {
  console.log(`\n${data}`);
  client.close();
  console.debug('closed')
});
req.end();