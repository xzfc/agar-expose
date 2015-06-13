// ==UserScript==
// @name        Agar.io Expose
// @version     1.6
// @namespace   xzfc
// @updateURL   https://raw.githubusercontent.com/xzfc/agar-expose/master/expose.user.js
// @include     http://agar.io/*
// @run-at      document-start
// @grant       none
// ==/UserScript==

if (window.top != window.self)
    return

function runExpose(){
    if (document.readyState !== 'loading')
        return console.error("Expose: this script should run at document-start")

    for(var i = 0; i < document.head.childNodes.length; i++)
        if(tryReplace(document.head.childNodes[i]))
            return

    function observerFunc(mutations) {
        for (var i = 0; i < mutations.length; i++) {
            var addedNodes = mutations[i].addedNodes
            for (var j = 0; j < addedNodes.length; j++)
                if(tryReplace(addedNodes[j])) {
                    observer.disconnect()
                    return
                }
        }
    }
    var observer = new MutationObserver(observerFunc)
    observer.observe(document.head, {childList: true})
}

runExpose()

function tryReplace(node) {
    if (!/^http:\/\/agar\.io\/main_out\.js/.test(node.src))
        return false
    document.head.removeChild(node)
    
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
    
    return true
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
    replace("allCells", /(=null;)(\w+)(.hasOwnProperty\(\w+\)?)/, "$1" + "window.agar.allCells=$2;" + "$2$3", '{}')
    replace("myCells",  /(case 32:)(\w+)(\.push)/,                "$1" + "window.agar.myCells=$2;" + "$2$3",  '[]')
    replace("top",      /case 49:[^:]+?(\w+)=\[];/,               "$&" + "window.agar.top=$1;",               '[]')
    replace("ws",       /new WebSocket\((\w+)[^;]+?;/,            "$&" + "window.agar.ws=$1;",                '""')
    replace("topTeams", /case 50:(\w+)=\[];/,                     "$&" + "window.agar.topTeams=$1;",          '[]')
    replace("reset",    /new WebSocket\(\w+[^;]+?;/,   "$&" + reset)

    return "window.agar={};" + reset + text
}
