const STREAM = require('ilp-protocol-stream')
const loader = require('ilp-module-loader')

;(async () => {
  
    const server = await STREAM.createServer({
        plugin: loader.createPlugin()
    })
    console.log(server.generateAddressAndSecret())
    server.on('error', (err) => console.error(err));
    server.on('stream', (stream) => {
        console.log('Got stream', headers)
        stream.pipe(process.stdout)
        stream.on('end', process.exit.bind(this,0))
    });

})()
