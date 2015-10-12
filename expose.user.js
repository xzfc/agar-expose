// ==UserScript==
// @name        Agar.io Expose
// @version     3.4
// @namespace   xzfc
// @updateURL   https://raw.githubusercontent.com/xzfc/agar-expose/master/expose.user.js
// @include     http://agar.io/*
// @run-at      document-start
// @grant       none
// ==/UserScript==

function makeProperty(name, varname) {
    return "'" + name + "' in window.agar || " +
        "Object.defineProperty( window.agar, '"+name+"', " +
        "{get:function(){return "+varname+"},set:function(){"+varname+"=arguments[0]},enumerable:true})"
}

function hook(name, args) {
    return "window.agar.hooks." + name + "&&window.agar.hooks." + name + "(" + args + ")"
}

var allRules = [
    { hostname: ["agar.io"],
      scriptTextRe: /console\.log\("socket open"\);/,
      replace: function (m) {
          m.replace("allCells",
                    /(=null;)(\w+)(.hasOwnProperty\(\w+\)?)/,
                    "$1" + "window.agar.allCells=$2;" + "$2$3",
                    '{}')

          m.replace("myCells",
                    /(case 32:)(\w+)(\.push)/,
                    "$1" + "window.agar.myCells=$2;" + "$2$3",
                    '[]')

          m.replace("top",
                    /case 49:[^:]+?(\w+)=\[];/,
                    "$&" + "window.agar.top=$1;",
                    '[]')

          m.replace("ws",
                    /new WebSocket\((\w+)[^;]+?;/,
                    "$&" + "window.agar.ws=$1;",
                    '""')

          m.replace("topTeams",
                    /case 50:(\w+)=\[];/,
                    "$&" + "window.agar.topTeams=$1;",
                    '[]')

          var dr = "(\\w+)=\\w+\\.getFloat64\\(\\w+,!0\\);\\w+\\+=8;\\n?"
          var dd = 7071.067811865476
          m.replace("dimensions",
                    RegExp("case 64:"+dr+dr+dr+dr),
                    "$&" + "window.agar.dimensions=[$1,$2,$3,$4],",
                    JSON.stringify([-dd,-dd,dd,dd]))

          var vr = "(\\w+)=\\w+\\.getFloat32\\(\\w+,!0\\);c\\+=4;"
          var text = m.text
          true &&
              m.replace("rawViewport:x,y;disableRendering:1",
                        /else \w+=\(29\*\w+\+(\w+)\)\/30,\w+=\(29\*\w+\+(\w+)\)\/30,.*?;/,
                        "$&" + "window.agar.rawViewport.x=$1;window.agar.rawViewport.y=$2;" +
                        "if(window.agar.disableRendering)return;") &&
              m.replace("disableRendering:2;Hook:skipCellDraw",
                        /(\w+:function\(\w+\){)(if\(this\.\w+\(\)\){\+\+this\.\w+;)/,
                        "$1" + "if(window.agar.disableRendering||" +  hook("skipCellDraw", "this") + ")return;" + "$2") &&
              m.replace("rawViewport:scale",
                /\w+=(Math\.pow\(Math\.min\(64\/\w+,1\),\.4\))/,
                "window.agar.rawViewport.scale=$1;" + "$&") &&
              m.replace("rawViewport.x,y,scale",
                RegExp("case 17:"+vr+vr+vr),
                "$&" + "window.agar.rawViewport.x=$1;window.agar.rawViewport.y=$2;window.agar.rawViewport.scale=$3;") &&
              (m.reset += "window.agar.rawViewport={x:0,y:0,scale:1};" + "agar.disableRendering=false;") ||
              (m.text = text)

          m.replace("reset",
                    /new WebSocket\(\w+[^;]+?;/,
                    "$&" + m.reset)

          m.replace("scale",
                    /function \w+\(\w+\){[^;]+;1>(\w+)&&\(\1=1\)/,
                    ";" + makeProperty("scale", "$1") + ";" + "$&")

          m.replace("minScale",
                    /;1>(\w+)&&\(\1=1\)/,
                    ";window.agar.minScale>$1&&($1=window.agar.minScale)",
                    "1")

          m.replace("region",
                    /console\.log\("Find "\+(\w+\+\w+)\);/,
                    "$&" + "window.agar.region=$1;",
                    '""')

          m.replace("isVirus",
                    /((\w+)=!!\(\w+&1\)[\s\S]{0,400})((\w+).(\w+)=\2;)/,
                    "$1$4.isVirus=$3")

          m.replace("dommousescroll",
                    /("DOMMouseScroll",)(\w+),/,
                    "$1(window.agar.dommousescroll=$2),")

          m.replace("skin",
                    /;null!=(\w+)\&\&\(\w+\.save\(\),\w+\.clip\(\),/,
                    ";if (typeof window.agar.skinF === 'function') $1 = window.agar.skinF(this, $1)" +
                    ";var expose_ssx2 = $1&&$1.big?2:1" +
                    "$&")

          m.replace("drawSkin;Hook:afterDrawSkin",
                    /;null!=(\w+)\&\&\((\w+\.save\(\)),(\w+\.clip\(\)),(\w+\.drawImage\(\w+,this\.\w+-this\.size)(,this\.\w+-this\.\w+)(,2\*this\.size)(,2\*this\.size)\),(\w+\.restore\(\))\);/,
                    ";if(null!=$1){$2;if(!$1.big)$3;$4*expose_ssx2$5*expose_ssx2$6*expose_ssx2$7*expose_ssx2);$8;}" + hook("afterDrawSkin", "a,this") + ";")

          m.replace("drawPellets",
                    /(if\s*\(\w+)\)\s*(\w+\.beginPath\(\)),\s*(\w+\.arc\(this\.\w+,\s*this\.\w+,\s*this\.size\s*\+\s*5,\s*0,\s*)(2\s*\*\s*Math\.PI)(,\s*!1\);)/,
                    "$1) {$2; $3$4*((this.size<20) && !window.agar.drawPellets ? 0:1)$5}",
                    "true")

          m.replace("showStartupBg",
                    /\w+\?\(\w\.globalAlpha=\w+,/,
                    "window.agar.showStartupBg && " + "$&",
                    "true")

          var vAlive = /\((\w+)\[(\w+)\]==this\){\1\.splice\(\2,1\);/.exec(m.text)
          var vEaten = /0<this\.\w+&&(\w+)\.push\(this\)}/.exec(m.text)
          if (vAlive && vEaten)
              m.replace("aliveCellsList;eatenCellsList",
                        RegExp(vAlive[1] + "=\\[\\];" + vEaten[1] + "=\\[\\];"),
                        'window.agar.aliveCellsList=' + vAlive[1] + '=[];' + 'window.agar.eatenCellsList=' + vEaten[1] + '=[];')
          else
              console.error("Expose: can't find vAlive or vEaten")

          m.replace("Hook:drawScore",
                    /(;(\w+)=Math\.max\(\2,(\w+\(\))\);)0!=\2&&/,
                    "$1(window.agar.hooks.drawScore&&window.agar.hooks.drawScore($3))||0!=$2&&")

          m.replace("Hook:beforeDraw",
                    /\w+\.scale\(\w+,\w+\);\w+\.translate\(-\w+,-\w+\);/,
                    "$&" + hook("beforeDraw","") + ";")

          m.replace("Hook:cellColor",
                    /\|\|this\.color,/,
                    "||" + hook("cellColor","this") + "$&")
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
                return false
            } else {
                this.text = newText
                if(defaultValue !== undefined)
                    this.reset += "window.agar." + what + "=" + defaultValue + ";"
                return true
            }
        },
        get: function() {
            return "window.agar={hooks:{}};" + this.reset + this.text
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
