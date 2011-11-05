// A reader for when we don't yet know what kind of thing
// the thing is.

module.exports = ProxyReader

var Reader = require("./reader.js")
  , getType = require("./get-type.js")
  , inherits = require("inherits")
  , fs = require("graceful-fs")

inherits(ProxyReader, Reader)

function ProxyReader (props) {
  var me = this
  if (!(me instanceof ProxyReader)) throw new Error(
    "ProxyReader must be called as constructor.")

  me.props = props
  me._buffer = []

  Reader.call(me, props)
}

ProxyReader.prototype._stat = function () {
  var me = this
    , props = me.props
    // stat the thing to see what the proxy should be.
    , stat = props.follow ? "stat" : "lstat"

  fs[stat](props.path, function (er, current) {
    var type
    if (er || !current) {
      type = "File"
    } else {
      type = getType(current)
    }

    props[type] = true
    props.type = me.type = type

    me._old = current
    me._addProxy(Reader(props, current))
  })
}

ProxyReader.prototype._addProxy = function (proxy) {
  var me = this
  if (me._proxy) {
    return me.emit("error", new Error("proxy already set"))
  }

  me._proxy = proxy
  ; [ "ready"
    , "error"
    , "close"
    , "data"
    , "end"
    , "linkpath"
    , "entry"
    , "warn"
    ].forEach(function (ev) {
      proxy.on(ev, me.emit.bind(me, ev))
    })

  me.emit("proxy", proxy)

  var calls = me._buffer
  me._buffer.length = 0
  calls.forEach(function (c) {
    proxy[c[0]].apply(proxy, c[1])
  })
}

ProxyReader.prototype.pause = function () {
  return this._proxy ? this._proxy.pause() : false
}

ProxyReader.prototype.resume = function (c) {
  return this._proxy ? this._proxy.resume() : false
}