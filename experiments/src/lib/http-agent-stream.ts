// import * as http from 'http'
// import * as net from 'net'

// // TODO The internal symbol is not exposed so let's use our own
// // const { async_id_symbol } = require('internal/async_hooks').symbols
// const asyncIdSymbol = Symbol('async_id_symbol')

// import { EventEmitter } from 'events'
// import { STREAM } from '.'

// /**
//  * Add necessary properties to `http.ClientRequest`
//  */
// interface Request extends http.ClientRequest {
//   timeout?: number
// }
// interface AgentOptions extends RequestOptions {
//   /**
//    * Keep sockets around in a pool to be used by other requests in the future. Default = false
//    */
//   keepAlive?: boolean
//   /**
//    * When using HTTP KeepAlive, how often to send TCP KeepAlive packets over sockets being kept alive. Default = 1000.
//    * Only relevant if keepAlive is set to true.
//    */
//   keepAliveMsecs?: number
//   /**
//    * Maximum number of sockets to allow per host. Default for Node 0.10 is 5, default for Node 0.12 is Infinity
//    */
//   maxSockets?: number
//   /**
//    * Maximum number of sockets to leave open in a free state. Only relevant if keepAlive is set to true. Default = 256.
//    */
//   maxFreeSockets?: number
//   /**
//    * Socket timeout in milliseconds. This will set the timeout after the socket is connected.
//    */
//   timeout?: number
// }

// /**
//  * Add necessary properties to `net.Socket`
//  */
// interface Socket extends net.Socket {
//   _handle: {
//     asyncReset: () => void
//     getAsyncId: () => string
//   }
//   _httpMessage: Request

//   timeout?: number
// }

// type SocketCallback = (error?: Error, socket?: Socket) => void

// /**
//  * Add necessary properties to `http.RequestOptions`
//  */
// interface RequestOptions extends http.RequestOptions {
//   encoding?: string
//   servername?: string
//   _agentKey?: string
// }

// /**
//  * TypeScript implementation of the default http.Agent.
//  *
//  * This is a direct copy of the source from node, proted to TypeScript with as few changes as possible while
//  * maintaining type safety.
//  */
// export default class Agent extends EventEmitter {

//   public requests: {
//     [k: string]: Request[]
//   }
//   public sockets: {
//     [k: string]: STREAM.Connection
//   }

//   public log: Console
//   public options: AgentOptions
//   public defaultPort = 80
//   public protocol = 'http:'

//   constructor (options?: AgentOptions) {
//     super()

//     this.log = console

//     this.options = Object.assign({}, options)

//     this.requests = {}
//     this.sockets = {}

//     this.on('free', (socket: Socket, options) => {
//       const name = this.getName(options)
//       this.log.debug('agent.on(free)', name)

//       if (socket.writable &&
//           this.requests[name] && this.requests[name].length) {
//         const req = this.requests[name].shift()
//         setRequestSocket(this, req as Request, socket)
//         if (this.requests[name].length === 0) {
//           // don't leak
//           delete this.requests[name]
//         }
//       } else {
//         // If there are no pending requests, then put it in
//         // the freeSockets pool, but only if we're allowed to do so.
//         const req = socket._httpMessage
//         if (req &&
//             req.shouldKeepAlive &&
//             socket.writable &&
//             this.keepAlive) {
//           let freeSockets = this.freeSockets[name]
//           const freeLen = freeSockets ? freeSockets.length : 0
//           let count = freeLen
//           if (this.sockets[name]) {
//             count += this.sockets[name].length
//           }
//           if (count > this.maxSockets || freeLen >= this.maxFreeSockets) {
//             socket.destroy()
//           } else if (this.keepSocketAlive(socket)) {
//             freeSockets = freeSockets || []
//             this.freeSockets[name] = freeSockets
//             socket[asyncIdSymbol] = -1
//             delete socket._httpMessage
//             this.removeSocket(socket, options)
//             freeSockets.push(socket)
//           } else {
//             // Implementation doesn't want to keep socket alive
//             socket.destroy()
//           }
//         } else {
//           socket.destroy()
//         }
//       }
//     })

//   }

//   public static defaultMaxSockets = Infinity

//   public get keepAliveMsecs () {
//     return this.options.keepAliveMsecs || 1000
//   }

//   public get keepAlive () {
//     return this.options.keepAlive || false
//   }

//   public get maxSockets () {
//     return this.options.maxSockets || Agent.defaultMaxSockets
//   }

//   public get maxFreeSockets () {
//     return this.options.maxFreeSockets || 256
//   }

//   public createConnection (options: any, callback: SocketCallback): Socket {
//     return net.createConnection(options, callback) as Socket
//   }

//   public keepSocketAlive (socket: Socket): boolean {
//     socket.setKeepAlive(true, this.keepAliveMsecs)
//     socket.unref()
//     return true
//   }

//   /**
//    * Get the key for a request to an ILP address and secret
//    *
//    * @param options.host The ILP address of the remote host
//    * @param options.auth The auth key from which the shared secret is derived
//    * @param options.localAddress The ILP address of the local host
//    */
//   public getName (options: http.RequestOptions): string {

//     if (!options.host || !options.auth || !options.localAddress) {
//       throw new Error(`An HTTP request sent over STREAM must have a 'host', 'auth' and 'localAddress' specified.`)
//     }

//     const sharedSecret = this.getPassword(options)
//     if (sharedSecret) {
//       // Test that it decodes before we use it
//       base64urlDecode(sharedSecret)
//     } else {
//       throw new Error(`Unable to get password from 'auth'.`)
//     }

//     return options.host + sharedSecret + options.localAddress
//   }

//   public getPassword (options: http.RequestOptions): string | undefined {
//     if (options.auth && options.auth.indexOf(':') > -1) {
//       return options.auth!.split(':')[1]
//     }
//   }
//   public addRequest (req: Request, options: RequestOptions) {

//     options = Object.assign({}, options, this.options)
//     const name = this.getName(options)

//     const freeLen = this.freeSockets[name] ? this.freeSockets[name].length : 0
//     const sockLen = freeLen + this.sockets[name].length

//     if (this.sockets[name]) {
//       // we have an existing connection, so use that.
//       const socket = this.freeSockets[name].shift() as Socket
//       // Guard against an uninitialized or user supplied Socket.
//       if (socket._handle && typeof socket._handle.asyncReset === 'function') {
//         // Assign the handle a new asyncId and run any init() hooks.
//         socket._handle.asyncReset()
//         socket[asyncIdSymbol] = socket._handle.getAsyncId()
//       }

//       this.reuseSocket(socket, req)
//       setRequestSocket(this, req, socket)
//       this.sockets[name].push(socket)
//     } else if (sockLen < this.maxSockets) {
//       this.log.debug('call onSocket', sockLen, freeLen)
//       // If we are under maxSockets create a new one.
//       this.createSocket(req, options, handleSocketCreation(this, req, true))
//     } else {
//       this.log.debug('wait for socket')
//       // We are over limit so we'll add it to the queue.
//       if (!this.requests[name]) {
//         this.requests[name] = []
//       }
//       this.requests[name].push(req)
//     }
//   }

//   public createSocket (req: Request, options: RequestOptions, callback: any) {
//     options = Object.assign({}, options, this.options)

//     if (options.socketPath) {
//       options.path = options.socketPath
//     }

//     if (!options.servername) {
//       options.servername = calculateServerName(options, req)
//     }

//     const name = this.getName(options)
//     options._agentKey = name

//     this.log.debug('createConnection', name, options)
//     delete options.encoding
//     let called = false
//     const onCreate: SocketCallback = (err, s) => {
//       if (called) {
//         return
//       }
//       called = true
//       if (err) {
//         return callback(err)
//       }
//       if (!this.sockets[name]) {
//         this.sockets[name] = []
//       }
//       this.sockets[name].push(s as Socket)
//       this.log.debug('sockets', name, this.sockets[name].length)
//       installListeners(this, s as Socket, options)
//       callback(null, s)
//     }

//     const newSocket = this.createConnection(options, onCreate)
//     if (newSocket) {
//       onCreate(undefined, newSocket)
//     }
//   }
//   public removeSocket (s: Socket, options: AgentOptions) {
//     const name = this.getName(options)
//     this.log.debug('removeSocket', name, 'writable:', s.writable)
//     const sets = [this.sockets]

//     // If the socket was destroyed, remove it from the free buffers too.
//     if (!s.writable) {
//       sets.push(this.freeSockets)
//     }

//     for (let sk = 0; sk < sets.length; sk++) {
//       let sockets = sets[sk]

//       if (sockets[name]) {
//         let index = sockets[name].indexOf(s)
//         if (index !== -1) {
//           sockets[name].splice(index, 1)
//           // Don't leak
//           if (sockets[name].length === 0) {
//             delete sockets[name]
//           }
//         }
//       }
//     }

//     if (this.requests[name] && this.requests[name].length) {
//       this.log.debug('removeSocket, have a request, make a socket')
//       const req = this.requests[name][0]
//       // If we have pending requests and a socket gets closed make a new one
//       const socketCreationHandler = handleSocketCreation(this, req, false)
//       this.createSocket(req, options, socketCreationHandler)
//     }
//   }

//   public reuseSocket (socket: Socket, req: Request): void {
//     this.log.debug('have free socket')
//     socket.ref()
//   }

//   public destroy (): void {
//     let sets = [this.freeSockets, this.sockets]
//     for (let s = 0; s < sets.length; s++) {
//       let set = sets[s]
//       let keys = Object.keys(set)
//       for (let v = 0; v < keys.length; v++) {
//         let setName = set[keys[v]]
//         for (let n = 0; n < setName.length; n++) {
//           setName[n].destroy()
//         }
//       }
//     }
//   }

//   private _error (error?: Error) {
//     process.nextTick(() => {
//       this.emit('error', error)
//     })
//   }
// }

// function calculateServerName (options: AgentOptions, req: Request) {
//   let servername = options.host
//   const hostHeader = req.getHeader('host') as string
//   if (hostHeader) {
//     // abc => abc
//     // abc:123 => abc
//     // [::1] => ::1
//     // [::1]:123 => ::1
//     if (hostHeader.startsWith('[')) {
//       const index = hostHeader.indexOf(']')
//       if (index === -1) {
//         // Leading '[', but no ']'. Need to do something...
//         servername = hostHeader
//       } else {
//         servername = hostHeader.substr(1, index - 1)
//       }
//     } else {
//       servername = hostHeader.split(':', 1)[0]
//     }
//   }
//   return servername
// }

// function installListeners (agent: Agent, s: Socket, options: AgentOptions) {
//   function onFree () {
//     agent.log.debug('CLIENT socket onFree')
//     agent.emit('free', s, options)
//   }
//   s.on('free', onFree)

//   function onClose (err?: Error) {
//     agent.log.debug('CLIENT socket onClose', err)
//     // This is the only place where sockets get removed from the Agent.
//     // If you want to remove a socket from the pool, just close it.
//     // All socket errors end in a close event anyway.
//     agent.removeSocket(s, options)
//   }
//   s.on('close', onClose)

//   function onRemove () {
//     // We need this function for cases like HTTP 'upgrade'
//     // (defined by WebSockets) where we need to remove a socket from the
//     // pool because it'll be locked up indefinitely
//     agent.log.debug('CLIENT socket onRemove')
//     agent.removeSocket(s, options)
//     s.removeListener('close', onClose)
//     s.removeListener('free', onFree)
//     s.removeListener('agentRemove', onRemove)
//   }
//   s.on('agentRemove', onRemove)
// }

// function handleSocketCreation (agent: Agent, request: Request, informRequest: boolean) {
//   return function handleSocketCreation_Inner (err?: Error, socket?: Socket) {
//     if (err) {
//       process.nextTick(() => {
//         request.emit('error', err)
//       })
//       return
//     }
//     if (informRequest) {
//       setRequestSocket(agent, request, socket as Socket)
//     } else {
//       (socket as Socket).emit('free')
//     }
//   }
// }

// function setRequestSocket (agent: Agent, req: Request, socket: Socket) {
//   req.onSocket(socket)
//   const agentTimeout = agent.options.timeout || 0
//   if (req.timeout === undefined || req.timeout === agentTimeout) {
//     return
//   }
//   socket.setTimeout(req.timeout)
//   // reset timeout after response end
//   req.once('response', (res) => {
//     res.once('end', () => {
//       if (socket.timeout !== agentTimeout) {
//         socket.setTimeout(agentTimeout)
//       }
//     })
//   })
// }

// function base64urlDecode (base64url: string): Buffer {
//   // Replace non-url compatible chars with base64 standard chars
//   const base64 = base64url
//       .replace(/-/g, '+')
//       .replace(/_/g, '/')

//   // Pad out with standard base64 required padding characters
//   const pad = base64.length % 4
//   if (pad) {
//     if (pad === 1) {
//       throw new Error('InvalidLengthError: Input base64url string is the wrong length to determine padding')
//     }
//     return Buffer.from(base64 + new Array(5 - pad).join('='), 'base64')
//   }
//   return Buffer.from(base64, 'base64')
// }
