var url = require('url')
var http = require('http')
const HttpAgent = require('../build/lib/http-agent').default

var endpoints = [
  // 'http://example.com',
  // 'http://localhost:8080',
  'http://test:pass@localhost',
]
 
const agent = new HttpAgent()
for (let i = 0; i < 1000; i++) {
  var options = url.parse(endpoints[Math.floor(Math.random() * endpoints.length)]);
  options.agent = agent;
  delete options.path
  http.get(options, function (res) {
    console.log(`Request ${i} to ${url} : ${res.statusCode}`)
    // console.log('"response" event!', res.headers);
    // res.pipe(process.stdout);
  });
}
