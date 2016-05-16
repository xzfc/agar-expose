// ==UserScript==
// @name        Agar.io Expose
// @version     5.1
// @namespace   xzfc
// @updateURL   https://raw.githubusercontent.com/xzfc/agar-expose/master/expose.user.js
// @include     http://agar.io/*
// @run-at      document-body
// @grant       none
// ==/UserScript==

function BufReader(buf) {
    var pos = 0
    var view = new DataView(buf)

    this.i8  = () => view.getInt8   ((pos += 1) - 1)
    this.u8  = () => view.getUint8  ((pos += 1) - 1)
    this.i16 = () => view.getInt16  ((pos += 2) - 2, true)
    this.u16 = () => view.getUint16 ((pos += 2) - 2, true)
    this.i32 = () => view.getInt32  ((pos += 4) - 4, true)
    this.u32 = () => view.getUint32 ((pos += 4) - 4, true)
    this.f32 = () => view.getFloat32((pos += 4) - 4, true)
    this.f64 = () => view.getFloat64((pos += 8) - 8, true)
    this.back = n => pos -= n

    this.utf8point = () => {
        var c1 = this.u8(), c2, c3
        switch (c1 >> 4) {
            case 0: case 1: case 2: case 3:
            case 4: case 5: case 6: case 7:
                return c1
            case 12: case 13:
                c1 = c1 & 0x1F
                c2 = this.u8() & 0x3F
                return c1 << 6 | c2
                break
            case 14:
                c1 = c1 & 0x0F
                c2 = this.u8() & 0x3F
                c3 = this.u8() & 0x3F
                return c1 << 12 | c2 << 6 | c3
        }
    }

    this.utf8string = () => {
        var res = "", c
        while (c = this.utf8point())
            res += String.fromCharCode(c)
        return res
    }
}

function BufWriter(maxlen) {
    var buf = new ArrayBuffer(maxlen)
    var pos = 0
    var view = new DataView(buf)

    this.i8  = v => view.setInt8   ((pos += 1) - 1, v)
    this.u8  = v => view.setUint8  ((pos += 1) - 1, v)
    this.i16 = v => view.setInt16  ((pos += 2) - 2, v, true)
    this.u16 = v => view.setUint16 ((pos += 2) - 2, v, true)
    this.i32 = v => view.setInt32  ((pos += 4) - 4, v, true)
    this.u32 = v => view.setUint32 ((pos += 4) - 4, v, true)
    this.f32 = v => view.setFloat32((pos += 4) - 4, v, true)
    this.f64 = v => view.setFloat64((pos += 8) - 8, v, true)

    this.get = () => buf
}

function runMemScanner(callback) {
    stage1()
    window.setTimeout(() => stage2(callback), 2500)
    return

    function stage1() {
        window.core.sendSpectate()
        sendViewportUpdate()
        window.agar._enableMessageReceiving = false
        return

        function sendViewportUpdate() {
            var b = new BufWriter(13)
            b.u8(0x11)
            b.f32(1234.567)
            b.f32(7654.321)
            b.f32(0.612345)
            window.agar.webSocket.onmessage({data: b.get()})
        }
    }

    function stage2(callback) {
        window.agar._enableMessageReceiving = true
        var f32 = new Float32Array(window.agar.buffer)
        var f64 = new Float64Array(window.agar.buffer)
        findScale()
        findViewport()
        console.log('Expose: scan done')
        window.core.connect(window.agar.ws)
        if (callback)
            callback()
        return

        function findScale() {
            var mem
            window.core.playerZoom(1000)
            window.core.playerZoom(-4)
            for (var i = 10; i < 100; i++)
                if (f64[i] === Math.pow(.9, -4)) {
                    mem = i
                    break
                }
            if (mem === undefined)
                return console.error("Expose: can't scan scale")
            property('scale',
                     () => f64[mem],
                     val => f64[mem] = val)
        }

        function findScale2() {
            var mem
            window.core.playerZoom(1000)
            for (var i = 10; i < 100; i++)
                if (f32[i] === 1.875) {
                    mem = i
                    break
                }
            if (mem === undefined)
                return console.error("Expose: can't scan scale2")
            property('scale2',
                     () => f32[mem],
                     val => f32[mem] = val)
        }

        function findViewport() {
            var mem
            for (var i = 0; i < 100; i++)
                if (Math.abs(f64[i+0] - 1234.567) < 0.01 &&
                    Math.abs(f64[i+1] - 7654.321) < 0.01) {
                    mem = i
                    break
                }
            if (mem === undefined)
                return console.error("Expose: can't scan rawViewport")
            property('rawViewport',
                     () => ({x: f64[mem+0],
                             y: f64[mem+1],
                            }))
        }

        function property(name, get, set) {
            Object.defineProperty(window.agar, name,
                                  {get:get, set:set})
        }
    }
}

var allRules = [
    { hostname: ["agar.io"],
      scriptUriRe: /^http:\/\/agar\.io\/agario\.core\.js/,
      replace: function (m) {
          m.removeNewlines()
          m.replace("var:buffer",
                    /=new ArrayBuffer/g,
                    "=$v" + "$&")
          m.replace("var:functions",
                    /\w+\.preloadedAudios=\{\}\;var\s\w+/,
                    "$&" + "=$v")
          m.replace("hook:cellDraw",
                    /\w+\((18),(\w+\[\w+>>2\]\|0),(\+\w+),(\+\w+),(\+\w+),(\+\w+),(\+\w+),(\w+\&1\|0)\)\|0;/,
                    "$h?$h($1,$2,$3,$4,$5,$6,$7,$8)" + ":$&")
          m.replace("var:h",
                    /\=\[\];var h\=/,
                    "$&" + "$v=")
      },
      init() {
          window.agar = {
              version: {
                  expose: GM_info.script.version,
                  epoch: 1,
              },
              hooks: {},
              cellProp: {},
              runMemScanner: runMemScanner,
              enableDirectionSending: true,
              _enableMessageReceiving: true,
              myCells: [],
              top: [],
          }

          window.OriginalWebSocket = window.WebSocket
          window.WebSocket = NewWebSocket

          return

          function refer(master, slave, prop) {
              Object.defineProperty(master, prop, {
                  get: () => slave[prop],
                  set: val => slave[prop] = val,
                  enumerable: true,
                  configurable: true
              })
          }
          function handleMessage(msg) {
              try {
                  handle(msg)
              } catch (e) {
                  console.groupCollapsed(e.stack)
                  console.log(dumpMessage(msg))
                  console.groupEnd()
              }
              return

              function handle(msg) {
                  var b = new BufReader(msg)
                  switch (b.u8()) {
                  case 0x12: return handleReset(b)
                  case 0x20: return handleOwnsBlob(b)
                  case 0x31: return handleLeaderboardUpdate(b)
                  case 0xff:
                      b.u32(), b.u16()
                      switch (b.u8()) {
                      case 0x10: return handleWorldUpdate(b)
                      case 0x40: return handleGameAreaSizeUpdate(b)
                      }
                  }
              }
              function handleReset(b) {
                  window.agar.myCells = []
              }
              function handleOwnsBlob(b) {
                  window.agar.myCells.push(b.u32())
              }
              function handleLeaderboardUpdate(b) {
                  var count = b.u32()
                  window.agar.top = []
                  for (var i = 0; i < count; i++) {
                      var id = b.u32()
                      var name = b.utf8string()
                      window.agar.top.push({id, name})
                  }
              }
              function handleWorldUpdate(b) {
                  var b0 = b.u8(), b1 = b.u8(), b2 = b.u8()
                  if (b0 == 0x10 && b1 >= 1 && b2 == 0) {
                      b0 = b1
                      b1 = b2
                  } else
                      b.back(1)
                  cnt_eats = b0 | b1<<8
                  for (var i = 0; i < cnt_eats; i++) {
                      var eater = b.u32(), victim = b.u32()
                      var id = window.agar.myCells.indexOf(victim)
                      if (id !== -1)
                          window.agar.myCells.splice(id, 1)
                  }
              }
              function handleGameAreaSizeUpdate(b) {
                  var x0 = b.f64(), y0 = b.f64(), x1 = b.f64(), y1 = b.f64()
                  window.agar.dimensions = [x0, y0, x1, y1]
                  if (window.agar.hooks.dimensionsUpdated)
                      window.agar.hooks.dimensionsUpdated(x0, y0, x1, y1)
              }
          }
          function dumpMessage(msg) {
              var a = new Uint8Array(msg)
              var i, c
              res = []
              for (i = 0; i < a.length; i++) {
                  c = a[i].toString(16)
                  if (c.length == 1) c = '0' + c
                  res.push(c)
              }
              return res.join(' ')
          }
          function NewWebSocket(url, protocols) {
              if (protocols === undefined)
                  protocols = []

              if (window.agar) {
                  window.agar.ws = url
                  window.agar.webSocket = this
              }

              var ws = new window.OriginalWebSocket(url, protocols)
              refer(this, ws, 'binaryType')
              refer(this, ws, 'bufferedAmount')
              refer(this, ws, 'extensions')
              refer(this, ws, 'protocol')
              refer(this, ws, 'readyState')
              refer(this, ws, 'url')

              this.send = data => {
                  if (data[0] === 16 && !window.agar.enableDirectionSending)
                      return
                  ws.send.call(ws, data)
              }
              this.close = () => ws.close.call(ws)

              this.onopen = _ => {}
              this.onclose = _ => {}
              this.onerror = _ => {}
              this.onmessage = _ => {}

              ws.onopen = event => {
                  if (this.onopen)
                      return this.onopen.call(ws, event)
              }
              ws.onmessage = event => {
                  handleMessage(event.data)
                  if (this.onmessage && window.agar._enableMessageReceiving)
                      this.onmessage.call(ws, event)
              }
              ws.onclose = event => {
                  if (this.onclose)
                      return this.onclose.call(ws, event)
              }
              ws.onerror = event => {
                  if (this.onerror)
                      return this.onerror.call(ws, event)
              }
          }
      }},
]

function makeProperty(name, varname) {
    return "'" + name + "' in window.agar || " +
        "Object.defineProperty( window.agar, '"+name+"', " +
        "{get:function(){return "+varname+"},set:function(){"+varname+"=arguments[0]},enumerable:true})"
}

if (window.top != window.self)
    return

if (document.readyState !== 'loading')
    return console.error("Expose: this script should run at document-start")

var isFirefox = /Firefox/.test(navigator.userAgent)

// Stage 1: Find corresponding rule
var rules
for (var i = 0; i < allRules.length; i++)
    if (allRules[i].hostname.indexOf(window.location.hostname) !== -1) {
        rules = allRules[i]
        break
    }
if (!rules)
    return console.error("Expose: cant find corresponding rule")


// Stage 2: Search for `main_out.js`
if (isFirefox) {
    function bse_listener(e) { tryReplace(e.target, e) }
    window.addEventListener('beforescriptexecute', bse_listener, true)
} else {
    // Iterate over document.head child elements and look for `main_out.js`
    for (var i = 0; i < document.body.childNodes.length; i++)
        if (tryReplace(document.body.childNodes[i]))
            return
    // If there are no desired element in document.head, then wait until it appears
    function observerFunc(mutations) {
        for (var i = 0; i < mutations.length; i++) {
            var addedNodes = mutations[i].addedNodes
            for (var j = 0; j < addedNodes.length; j++)
                if (tryReplace(addedNodes[j]))
                    return observer.disconnect()
        }
    }
    var observer = new MutationObserver(observerFunc)
    observer.observe(document.body, {childList: true})
}

// Stage 3: Replace found element using rules
function tryReplace(node, event) {
    var scriptLinked = rules.scriptUriRe && rules.scriptUriRe.test(node.src)
    var scriptEmbedded = rules.scriptTextRe && rules.scriptTextRe.test(node.textContent)
    if (node.tagName != "SCRIPT" || (!scriptLinked && !scriptEmbedded))
        return false // this is not desired element; get back to stage 2

    if (isFirefox) {
        event.preventDefault()
        window.removeEventListener('beforescriptexecute', bse_listener, true)
    }

    var mod = {
        reset: "",
        text: null,
        history: [],
        save() {
            this.history.push({reset:this.reset, text:this.text})
            return true
        },
        restore() {
            var state = this.history.pop()
            this.reset = state.reset
            this.text = state.text
            return true
        },
        reset_(reset) {
            this.reset += reset
            return true
        },
        replace(what, from, to, reset) {
            var vars = [], hooks = []
            what.split(" ").forEach((x) => {
                x = x.split(":")
                x[0] === "var" && vars.push(x[1])
                x[0] === "hook" && hooks.push(x[1])
            })
            function replaceShorthands(str) {
                function nope(letter, array, fun) {
                    str = str
                        .split(new RegExp('\\$' + letter + '([0-9]?)'))
                        .map((v,n) => n%2 ? fun(array[v||0]) : v)
                        .join("")
                }
                nope('v', vars, (name) => "window.agar." + name)
                nope('h', hooks, (name) => "window.agar.hooks." + name)
                nope('H', hooks, (name) =>
                     "window.agar.hooks." + name + "&&" +
                     "window.agar.hooks." + name)
                return str
            }
            var newText = this.text.replace(from, replaceShorthands(to))
            if(newText === this.text) {
                console.error("Expose: `" + what + "` replacement failed!")
                return false
            } else {
                this.text = newText
                if (reset)
                    this.reset += replaceShorthands(reset) + ";"
                return true
            }
        },
        removeNewlines() {
            this.text = this.text.replace(/([,\/;])\n/mg, "$1")
        },
        get: function() {
            return "window.exposeInit();" + this.reset + this.text
        }
    }

    window.exposeInit = rules.init

    if (scriptEmbedded) {
        mod.text = node.textContent
        rules.replace(mod)
        if (isFirefox) {
            document.body.removeChild(node)
            var script = document.createElement("script")
            script.textContent = mod.get()
            document.head.appendChild(script)
        } else {
            node.textContent = mod.get()
        }
        console.log("Expose: replacement done")
    } else {
        document.body.removeChild(node)
        var request = new XMLHttpRequest()
        request.onload = function() {
            var script = document.createElement("script")
            mod.text = this.responseText
            rules.replace(mod)
            script.textContent = mod.get()
            // `main_out.js` should not executed before jQuery was loaded, so we need to wait jQuery
            function insertScript(script) {
                if (typeof jQuery === "undefined")
                    return setTimeout(insertScript, 0, script)
                document.head.appendChild(script)
                console.log("Expose: replacement done")
            }
            insertScript(script)
        }
        request.onerror = function() { console.error("Expose: response was null") }
        request.open("get", node.src, true)
        request.send()
    }

    return true
}
