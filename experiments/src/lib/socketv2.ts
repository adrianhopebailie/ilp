import * as net from 'net'
import { IlpPlugin, createPlugin } from 'ilp-module-loader'
import { createConnection, DataAndMoneyStream } from 'ilp-protocol-stream'

export interface IlpSocketConstructorOpts {
  plugin: IlpPlugin
}

export interface IlpSocketConnectrOpts {
  destinationAccount: string
  sharedSecret: Buffer
}

async function createStream (plugin: IlpPlugin, destinationAccount: string, sharedSecret: Buffer): Promise<DataAndMoneyStream> {

  if (!plugin.isConnected()) {
    await plugin.connect()
  }

  // TODO Cache connections to same address/secret
  const connection = await createConnection({ plugin, destinationAccount, sharedSecret })

  return connection.createStream()
}

export class IlpSocket extends net.Socket {

  private _plugin: IlpPlugin
  private _stream: DataAndMoneyStream
  private _connecting = false
  private _bytesRead: number = 0
  private _bytesWritten: number = 0
  private _encoding?: string
  private _timeout?: NodeJS.Timer
  private _timeoutMs: number = 0
  private _cork: number = 0
  remoteFamily = 'ilp'
  remoteAddress?: string | undefined
  remotePort?: number | undefined
  localAddress: string
  localPort: number

  constructor (options?: IlpSocketConstructorOpts) {
    super({
    })
    this._plugin = (options) ? options.plugin : createPlugin()
  }

  get bytesRead (): number {
    return this._bytesRead
  }
  get bytesWritten (): number {
    return this._bytesWritten
  }
  public get bufferSize (): number {
    // TODO - calculate buffer size
    return 0
  }
  get destroyed (): boolean {
    return !this._stream
  }

  get connecting (): boolean {
    return this._connecting
  }

  setEncoding (encoding: string): this {
    this._encoding = encoding
    if (this._stream) {
      this._stream.setEncoding(encoding)
    }
    return this
  }
  pause (): this {
    if (this._stream) {
      this._stream.pause()
    }
    return this
  }
  resume (): this {
    if (this._stream) {
      this._stream.resume()
    }
    return this
  }
  setTimeout (timeout: number, callback?: (...args: any[]) => void | Function | undefined): this {

    if (this._timeout) {
      clearTimeout(this._timeout)
    }

    if (timeout === 0) {
      if (callback) {
        this.removeListener('timeout', callback)
      }
    } else {
      this._timeout = setTimeout(() => {
        this.emit('timeout')
      }, timeout)
      if (callback) {
        this.once('timeout', callback)
      }
    }
    return this
  }
  private _resetTimeout () {
    if (this._timeoutMs > 0) {
      this.setTimeout(this._timeoutMs)
    }
  }
  setNoDelay (noDelay?: boolean | undefined): this {
    // No-op
    return this
  }
  setKeepAlive (enable?: boolean | undefined, initialDelay?: number | undefined): this {
    // No-op
    return this
  }
  address (): net.AddressInfo {
    return {
      address: this.localAddress,
      family: 'ilp',
      port: 0
    }
  }
  unref (): this {
    if (!this._stream) {
      this.once('connect', this.unref)
      return this
    }

    // TODO Need an unref() implementation in DataAndMoneyStream
    // if (typeof this._stream.unref === 'function') {
    //   this._stream.unref()
    // }
    return this
  }
  ref (): this {
    if (!this._stream) {
      this.once('connect', this.ref)
      return this
    }

    // TODO Need a ref() implementation in DataAndMoneyStream
    // if (typeof this._stream.ref === 'function') {
    //   this._stream.ref()
    // }
    return this
  }
  public get readable (): boolean {
    return this._stream && this._stream.readable
  }
  public get readableHighWaterMark (): number {
    return this._stream ? this._stream.readableHighWaterMark : 0
  }
  public get readableLength (): number {
    return this._stream ? this._stream.readableLength : 0
  }
  public get writable (): boolean {
    return this._stream && this._stream.writable
  }
  public get writableHighWaterMark (): number {
    return (this._stream) ? this._stream.writableHighWaterMark : 0
  }
  public get writableLength (): number {
    return (this._stream) ? this._stream.writableLength : 0
  }

  connect (options: net.SocketConnectOpts | IlpSocketConnectrOpts | number | string, connectionListener?: Function | undefined): this
  connect (port: number, host: string, connectionListener?: Function | undefined): this
  connect (options: any, connectionListener?: any, redundant?: any): this {
    if (this._connecting) {
      // TODO - Throw?
      return this
    }
    this._connecting = true

    // We only support one of the net.Socket.connect signatures
    if (typeof options !== 'object' || typeof redundant !== 'undefined' ||
    (typeof connectionListener !== 'undefined' && typeof connectionListener !== 'function')) {
      throw new Error('IlpSocket only supports the connect(options, listener) signature.')
    }
    if (!options.destinationAccount || !options.sharedSecret) {
      throw new Error('destinationAccount and sharedSecret are required.')
    }

    const { destinationAccount, sharedSecret } = options

    if (connectionListener) {
      this.once('connect', connectionListener)
    }

    createStream(this._plugin, destinationAccount, sharedSecret).then(stream => {
      this._stream = stream
      if (this._encoding) {
        this._stream.setEncoding(this._encoding)
      }
      this._stream.on('close', () => { this.emit('close') })
      this._stream.on('connect', () => { this.emit('connect') })
      this._stream.on('data', (chunk: any) => {
        this._resetTimeout()
        this.emit('data', chunk)
      })
      this._stream.on('drain', () => { this.emit('drain') })
      this._stream.on('end', () => this.emit('end'))
      this._stream.on('error', (error: Error) => { this.emit('error', error) })
      this._stream.on('money', (amount: string) => {
        this._resetTimeout()
        this.emit('money', amount)
      })
      this._stream.on('ready', () => { this.emit('ready') })

      this.remoteAddress = destinationAccount
      this.remotePort = 0

      this._connecting = false
      this.emit('connect')
    })

    return this
  }

  write (buffer: Buffer | string, cb?: Function | undefined): boolean
  write (str: string, encoding?: string | undefined, callbackOrFiledescriptor?: string | Function | undefined): boolean
  write (data: any, encoding?: string | undefined, callback?: Function | undefined): void
  write (data: any, encoding?: any, callback?: any): boolean {
    if (!this._stream) {
      this.destroy(new Error('IlpSocket is closed.'))
      return false
    }
    this._resetTimeout()
    return this._stream.write(data, encoding, callback)
  }
  end (data: string | Buffer, cb?: Function | undefined): void
  end (data: string, encoding?: string | undefined, cb?: Function | undefined): void
  end (data?: any, encoding?: string | undefined): void
  end (data?: any, encoding?: any, cb?: any) {
    return this._stream.end(data, encoding, cb)
  }
  setDefaultEncoding (encoding: string): this {
    this._stream.setDefaultEncoding(encoding)
    return this
  }
  cork (): void {
    if (!this._stream) {
      this._cork++
    } else {
      this._stream.cork()
    }
  }
  uncork (): void {
    if (!this._stream) {
      if (this._cork) {
        this._cork--
      }
    } else {
      this._stream.uncork()
    }
  }
  _read (size: number): void {
    if (!this._stream) {
      throw new Error('IlpSocket is closed.')
    }
    return this._stream._read(size)
  }
  read (size?: number | undefined) {
    if (!this._stream) {
      throw new Error('IlpSocket is closed.')
    }
    return this._stream.read(size)
  }
  isPaused (): boolean {
    return this._stream.isPaused()
  }
  unpipe<T extends NodeJS.WritableStream> (destination?: T | undefined): this {
    if (!this._stream) {
      throw new Error('IlpSocket is closed.')
    }
    this._stream.unpipe(destination)
    return this
  }
  unshift (chunk: any): void {
    if (!this._stream) {
      throw new Error('IlpSocket is closed.')
    }
    return this._stream.unshift(chunk)
  }
  wrap (oldStream: NodeJS.ReadableStream): this {
    if (!this._stream) {
      throw new Error('IlpSocket is closed.')
    }
    this._stream.wrap(oldStream)
    return this
  }
  push (chunk: any, encoding?: string | undefined): boolean {
    if (!this._stream) {
      throw new Error('IlpSocket is closed.')
    }
    return this._stream.push(chunk, encoding)
  }
  destroy (error?: Error | undefined): void {
    if (this._stream) {
      return this._stream.destroy(error)
    }
  }
  pipe<T extends NodeJS.WritableStream> (destination: T, options?: { end?: boolean | undefined; } | undefined): T {
    if (!this._stream) {
      throw new Error('IlpSocket is closed.')
    }
    return this._stream.pipe(destination, options)
  }
  [Symbol.asyncIterator] (): AsyncIterableIterator<any> {
    return this._stream[Symbol.asyncIterator]
  }
  _write (chunk: any, encoding: string, callback: (error?: Error | null | undefined) => void): void {
    this._stream._write(chunk, encoding, callback)
  }
  _destroy (error: Error | null, callback: (error: Error | null) => void): void {
    this._stream._destroy(error, callback)
  }
  _final (callback: (error?: Error | null | undefined) => void): void {
    this._stream._final(callback)
  }
}
