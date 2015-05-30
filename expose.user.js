// ==UserScript==
// @name        Agar.io Expose
// @version     1.3
// @namespace   xzfc
// @updateURL   https://raw.githubusercontent.com/xzfc/agar-expose/master/expose.user.js
// @include     http://agar.io/
// @run-at      document-start
// @grant       none
// ==/UserScript==

if (window.top != window.self)
    return

var observer = new MutationObserver(function(mutations) {
    for (var i = 0; i < mutations.length; i++) {
        var addedNodes = mutations[i].addedNodes
        for (var j = 0; j < addedNodes.length; j++) {
            var addedNode = addedNodes[j]
            if (/^http:\/\/agar\.io\/main_out\.js/.test(addedNode.src)) {
                document.head.removeChild(addedNode)
                observer.disconnect()
                runRequest()
                return
            }
        }
    }
})
observer.observe(document.head, {childList: true})

function runRequest() {
    var request = new XMLHttpRequest()
    request.onload = function() {
        var script = document.createElement("script")
        script.innerHTML = modify(this.responseText)
        insertScript(script)
        console.log("Expose: replacement done")
    }
    request.onerror = function() { console.error("Expose: response was null") }
    request.open("get", "http://agar.io/main_out.js", true)
    request.send()
}

function insertScript(script) {
    if (typeof jQuery === "undefined")
        return setTimeout(insertScript, 0, script)
    document.head.appendChild(script)
}

function modify(text) {
    var reset = ""
    function replace(what, from, to, defaultValue) {
        var newText = text.replace(from, to)
        if(newText === text) {
            console.error("Expose: " + what + " replacement failed!")
        } else {
            text = newText
            if(defaultValue !== undefined)
                reset += "window.agar." + what + "=" + defaultValue + ";"
        }
    }
    replace("allCells", /(\w+)\.push\(this\);/,     "$&" + "window.agar.allCells=$1;",         '[]')
    replace("myCells",  /(case 32:)(\w+)(\.push)/,  "$1" + "window.agar.myCells=$2;" + "$2$3", '[]')
    replace("top",      /case 49:[^:]+?(\w+)=\[];/, "$&" + "window.agar.top=$1;",              '[]')
    replace("ws",       /new WebSocket\((\w+)\);/,  "$&" + "window.agar.ws=$1;",               '""')
    replace("topTeams", /case 50:(\w+)=\[];/,       "$&" + "window.agar.topTeams=$1;",         '[]')
    replace("reset",    /new WebSocket\(\w+\);/,    "$&" + reset)

    return "window.agar={};" + reset + text
}
