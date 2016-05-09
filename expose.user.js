// ==UserScript==
// @name        Agar.io Expose
// @version     5.0
// @namespace   xzfc
// @updateURL   https://raw.githubusercontent.com/xzfc/agar-expose/master/expose.user.js
// @include     http://agar.io/*
// @run-at      document-body
// @grant       none
// ==/UserScript==

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
              hooks: {},
              cellProp: {},
              enableDirectionSending: true,
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
              var a = new Uint8Array(msg)
              if (a[0] !== 49)
                  return
              var i, pos = 5
              window.agar.top = []
              for (i = 0; i < a[1]; i++) {
                  var id = a[pos]; pos += 4
                  var name = "", c1, c2, c3
                  while (c1 = a[pos++])
                      switch (c1 >> 4) {
                          case 0: case 1: case 2: case 3:
                          case 4: case 5: case 6: case 7:
                              name += String.fromCharCode(c1)
                              break
                          case 12: case 13:
                              c2 = a[pos++]
                              name += String.fromCharCode((c1 & 0x1F) << 6 |
                                                          (c2 & 0x3F))
                              break
                          case 14:
                              c2 = a[pos++]
                              c3 = a[pos++]
                              name += String.fromCharCode((c1 & 0x0F) << 12 |
                                                          (c2 & 0x3F) <<  6 |
                                                          (c3 & 0x3F) <<  0)
                      }
                      window.agar.top.push({id, name})
              }
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
                  if (this.onmessage)
                      return this.onmessage.call(ws, event)
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
