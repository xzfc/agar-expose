// ==UserScript==
// @name        Agar.io Expose
// @version     2.0
// @namespace   xzfc
// @updateURL   https://raw.githubusercontent.com/xzfc/agar-expose/master/expose.user.js
// @include     http://agar.io/*
// @include     http://petridish.pw/*
// @run-at      document-start
// @grant       none
// ==/UserScript==

var allRules = [
    { hostname: ["agar.io"],
      scriptRe: /^http:\/\/agar\.io\/main_out\.js/,
      replace: function (m) {
          m.replace("allCells", /(=null;)(\w+)(.hasOwnProperty\(\w+\)?)/, "$1" + "window.agar.allCells=$2;" + "$2$3", '{}')
          m.replace("myCells",  /(case 32:)(\w+)(\.push)/,                "$1" + "window.agar.myCells=$2;" + "$2$3",  '[]')
          m.replace("top",      /case 49:[^:]+?(\w+)=\[];/,               "$&" + "window.agar.top=$1;",               '[]')
          m.replace("ws",       /new WebSocket\((\w+)[^;]+?;/,            "$&" + "window.agar.ws=$1;",                '""')
          m.replace("topTeams", /case 50:(\w+)=\[];/,                     "$&" + "window.agar.topTeams=$1;",          '[]')
          m.replace("reset",    /new WebSocket\(\w+[^;]+?;/,              "$&" + m.reset)
          m.replace("region",   /console\.log\("Find "\+(\w+)\+\w+\);/,   "$&" + "window.agar.region=$1;",            '""')
      }},
    { hostname: ["petridish.pw"],
      scriptRe: /\/engine\/main[0-9]+.js\?/,
      replace: function(m) {
          m.replace("allCells", /if \(blobs\.hasOwnProperty\(id\)\) {/,   "window.agar.allCells=blobs;" + "$&",       '{}')
          m.replace("myCells",  /case 32:/,                               "$&" + "window.agar.myCells=ids;",          '[]')
          m.replace("top",      /case 49:(.|\n|\r){0,400}users = \[\];/,  "$&" + "window.agar.top=users;",            '[]')
          m.replace("ws",       /new WebSocket\((\w+)[^;]+?;/,            "$&" + "window.agar.ws=$1;",                '""')
          m.replace("reset",    /new WebSocket\(\w+[^;]+?;/,              "$&" + m.reset)
      }},
]


if (window.top != window.self)
    return

if (document.readyState !== 'loading')
    return console.error("Expose: this script should run at document-start")


// Stage 1: Find corresponding rule
var rules
for (var i = 0; i < allRules.length; i++)
    if (allRules[i].hostname.indexOf(window.location.hostname) !== -1) {
        rules = allRules[i]
        break
    }
if (!rules)
    return console.error("Expose: cant find corresponding rule")


// Stage 2: Iterate over document.head child elements and look for `main_out.js`
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


// Stage 3: Replace found element using rules
function tryReplace(node) {
    if (!rules.scriptRe.test(node.src))
        return false // this is not desired element; get back to stage 2
    document.head.removeChild(node)

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

    var request = new XMLHttpRequest()
    request.onload = function() {
        var script = document.createElement("script")
        mod.text = this.responseText
        rules.replace(mod)
        script.innerHTML = mod.get()
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

    return true
}
