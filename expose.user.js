// ==UserScript==
// @name        Agar.io Expose
// @version     2.6
// @namespace   xzfc
// @updateURL   https://raw.githubusercontent.com/xzfc/agar-expose/master/expose.user.js
// @include     http://agar.io/*
// @include     http://petridish.pw/*
// @include     http://fxia.me/agar/
// @run-at      document-start
// @grant       none
// ==/UserScript==

var allRules = [
    { hostname: ["agar.io"],
      scriptTextRe: /console\.log\("socket open"\);/,
      replace: function (m) {
          var dr = "(\\w+)=\\w+\\.getFloat64\\(\\w+,!0\\);\\w+\\+=8;\\n?"
          var dd = 7071.067811865476; dd = JSON.stringify([-dd,-dd,dd,dd])
          m.replace("allCells",   /(=null;)(\w+)(.hasOwnProperty\(\w+\)?)/, "$1" + "window.agar.allCells=$2;" + "$2$3",    '{}')
          m.replace("myCells",    /(case 32:)(\w+)(\.push)/,                "$1" + "window.agar.myCells=$2;" + "$2$3",     '[]')
          m.replace("top",        /case 49:[^:]+?(\w+)=\[];/,               "$&" + "window.agar.top=$1;",                  '[]')
          m.replace("ws",         /new WebSocket\((\w+)[^;]+?;/,            "$&" + "window.agar.ws=$1;",                   '""')
          m.replace("topTeams",   /case 50:(\w+)=\[];/,                     "$&" + "window.agar.topTeams=$1;",             '[]')
          m.replace("dimensions", RegExp("case 64:"+dr+dr+dr+dr),           "$&" + "window.agar.dimensions=[$1,$2,$3,$4],", dd)
          m.replace("reset",      /new WebSocket\(\w+[^;]+?;/,              "$&" + m.reset)
          m.replace("region",     /console\.log\("Find "\+(\w+\+\w+)\);/,   "$&" + "window.agar.region=$1;",               '""')
          m.replace("isVirus",    /((\w+)=!!\(\w+&1\)[\s\S]{0,400})((\w+).(\w+)=\2;)/, "$1$4.isVirus=$3")
          m.replace("dommousescroll", /("DOMMouseScroll",)(\w+),/,          "$1(window.agar.dommousescroll=$2),")
          m.replace("skin",       /;null==(\w+)\|\|(\w+)\|\|\(\w+\.save\(\),\w+\.clip\(\),/,
                    ";if(this.skin)$1=this.skin;$1||($1=window.agar.defaultSkin||null);if($1&&$1.big)$2=true" + "$&")
      }},
    { hostname: ["petridish.pw"],
      scriptUriRe: /\/engine\/main[0-9]+.js\?/,
      replace: function(m) {
          var d = "[minX,minY,maxX,maxY]"
          var dd = '[0,0,11180,11180]'
          m.replace("allCells",   /if \(blobs\.hasOwnProperty\(id\)\) {/,   "window.agar.allCells=blobs;" + "$&",       '{}')
          m.replace("myCells",    /case 32:/,                               "$&" + "window.agar.myCells=ids;",          '[]')
          m.replace("top",        /case 49:(.|\n|\r){0,400}users = \[\];/,  "$&" + "window.agar.top=users;",            '[]')
          m.replace("ws",         /new WebSocket\((\w+)[^;]+?;/,            "$&" + "window.agar.ws=$1;",                '""')
          m.replace("dimensions", /(case 64:)(?:.|\n|\r)*?(break;)/,        "$1" + "window.agar.dimensions=" + d + ";$2", dd)
          m.replace("reset",      /new WebSocket\(\w+[^;]+?;/,              "$&" + m.reset)
      }},
    { hostname: ["fxia.me"],
      scriptUriRe: /\/main_out\.js\?[0-9]+/,
      replace: function(m) {
          m.replace("allCells", /if \(nodes\.hasOwnProperty\(nodeid\)\) {/,
                    "window.agar.allCells=nodes;" + "$&",       '{}')
          m.replace("myCells", /(case 32: \/\/ add node(?:.|\n|\r)+?)(break;)/,
                    "$1" + "window.agar.myCells = nodesOnScreen;" + "$2", '[]')
          m.replace("top", /(case 49:(?:.|\n|\r)+?)(break;)/,
                    "$1" + "window.agar.top = leaderBoard;" + "$2", '[]')
          m.replace("ws", /ws = new WebSocket\(wsUrl\);/,
                    "$&" + "window.agar.ws = wsUrl;", '""')
          m.replace("dimensions", /(case 64:(?:.|\n|\r)+?)(break;)/,
                    "$1" + "window.agar.dimensions = [leftPos,topPos,rightPos,bottomPos];" + "$2", '[0,0,11180,11180]')
          m.replace("reset", /ws = new WebSocket\(wsUrl\);/,
                   "$&" + m.reset)
          m.replace("onload", /$/, "window.onload()")
      }},
]


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
    for (var i = 0; i < document.head.childNodes.length; i++)
        if (tryReplace(document.head.childNodes[i]))
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
    observer.observe(document.head, {childList: true})
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
        replace: function(what, from, to, defaultValue) {
            var newText = this.text.replace(from, to)
            if(newText === this.text) {
                console.error("Expose: " + what + " replacement failed!")
            } else {
                this.text = newText
                if(defaultValue !== undefined)
                    this.reset += "window.agar." + what + "=" + defaultValue + ";"
            }
        },
        get: function() {
            return "window.agar={};" + this.reset + this.text
        }
    }

    if (scriptEmbedded) {
        mod.text = node.textContent
        rules.replace(mod)
        if (isFirefox) {
            document.head.removeChild(node)
            var script = document.createElement("script")
            script.textContent = mod.get()
            document.head.appendChild(script)
        } else {
            node.textContent = mod.get()
        }
        console.log("Expose: replacement done")
    } else {
        document.head.removeChild(node)
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
