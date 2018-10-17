import * as http2 from 'http2'
import * as url from 'url'
import * as net from 'net'
import * as base64url from './util/base64url'
import { IlpPlugin, AssetInfo, createPlugin } from 'ilp-module-loader'
import { IlpSocket, IlpSocketConstructorOpts, IlpSocketConnectrOpts } from './socket'

interface Http2IlpClientSessionOptions extends http2.ClientSessionOptions {

  /**
   * Undocumented node http2 API feature.
   * See: https://github.com/nodejs/node/blob/master/lib/internal/http2/core.js#L2723
   *
   * We pass in a custom handler here so we can return an ILP STREAM
   */
  createConnection: (authority: url.URL, options?: Http2IlpClientSessionOptions) => net.Socket
}

export type Http2IlpCreateOpts = IlpSocketConstructorOpts & IlpSocketConnectrOpts

export function createHttp2Connection (options: Http2IlpCreateOpts) {
  const protocol = 'http+ilp-stream'
  const host = options.destinationAccount
  const password = base64url.encode(options.sharedSecret)
  const { plugin } = options

  const httpConnectOptions: Http2IlpClientSessionOptions = {
    createConnection: (authority: url.URL, opts?: any) => {
      opts.destinationAccount = authority.host
      opts.sharedSecret = base64url.decode(authority.password)
      const socket = new IlpSocket({ plugin })
      socket.connect(options)
      return socket
    }
  }

  return http2.connect(`${protocol}://:${password}@${host}:0`, httpConnectOptions)
}
