// ==UserScript==
// @name        Agar.io Expose
// @version     3.3
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
              m.replace("disableRendering:2",
                        /(\w+:function\(\w+\){)(if\(this\.\w+\(\)\){\+\+this\.\w+;)/,
                        "$1" + "if(window.agar.disableRendering)return;" + "$2") &&
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

          m.replace("drawSkin",
                    /;null!=(\w+)\&\&\((\w+\.save\(\)),(\w+\.clip\(\)),(\w+\.drawImage\(\w+,this\.\w+-this\.size)(,this\.\w+-this\.\w+)(,2\*this\.size)(,2\*this\.size)\),(\w+\.restore\(\))\);/,
                    ";if(null!=$1){$2;if(!$1.big)$3;$4*expose_ssx2$5*expose_ssx2$6*expose_ssx2$7*expose_ssx2);$8;};")
                    
          m.replace("drawPellets",
                    /(if\s*\(\w+)\)\s*(\w+\.beginPath\(\)),\s*(\w+\.arc\(this\.\w+,\s*this\.\w+,\s*this\.size\s*\+\s*5,\s*0,\s*)(2\s*\*\s*Math\.PI)(,\s*!1\);)/,
                    "$1) {$2; $3$4*((this.size<20) && !window.agar.drawPellets ? 0:1)$5}")
                    
       	m.replace("paintPellets",
                    /(\w+)\?\((\w+\.fillStyle=.+),(\w+\.strokeStyle=.+)\):\(\w+=ec\(this\.J\)\|\|(this\.color),(\w+\.fillStyle=)\w+\,(\w+\.strokeStyle=)\w+\);/,
                    "if($1){$2;$3;}else if(this.size*this.size/100<5 && window.bakaconf!==undefined){$5$6window.bakaconf.pelletColor;} else if(this.isVirus && window.bakaconf!==undefined){$5$6window.bakaconf.virusColor}else {$5$4;$6$4;}")
          
          m.replace("showMass",
                    /(this\.id\&\&Jb\&\&)(.*)(20<this\.size)\)/,
                    "$1$3")
          
          m.replace("cellNameOffset",
                    /(\w+\.drawImage\(\w+,~~this\.x-~~\(\w+\/2\),\w+-~~\()(\w+\/2)(\),\w+,\w+\);)/,
                    "$1$2*window.bakaconf.cellNameOffsetY$3")
          
          m.replace("cellMassOffset",
                    /(\w+\.drawImage\(\w+,\s+~~this\.x-~~\(\w+\/2\),\w+-~~\()(\w+\/2)(\),\w+,\w+\)\);)/,
                    "$1$2*(this.f?1:window.bakaconf.cellMassOffsetY)$3")
          
          m.replace("cellMassScale",
                    /(\w+\.G\(this\.i\(\)\/2)(\))/,
                    "$1*(this.f?6:window.bakaconf.cellMassScale)$2")
          
          m.replace("virusShots",
                    /(c\.u\(~~\()(this.size\*this\.size\/100)(\)\),\w+=Math\.ceil)/,
                    "$1this.f?(200-this.size*this.size/100)/14:$2$3")
          
          m.replace("scoreTextCoords",
                    /(\w+\.drawImage\(\w+,)(15)(,)(\w+-10-24-5)(\)\);)/,
                    "$1window.bakaconf.scoreX+3$3window.bakaconf.scoreY+3$5")
          
          m.replace("scoreBackCoords",
                    /(\w+\.fillRect\()(10)(,)(\w+-10-24-10)(,\w+\+10,34\))/,
                    "$1window.bakaconf.scoreX$3window.bakaconf.scoreY$5")
                    
          m.replace("colorCoding & splitGuide",
                    /(\w+)\.globalAlpha=1;\w+=-1!=\w+\.indexOf\(this\);/,
"var size_margin = (window.agar.colorOffensive ? window.agar.myCellsMax : window.agar.myCellsMin);\
if (window.agar.enableColorCoding && window.agar.myCells.length != 0) {\
if (!this.isVirus && this.size*this.size/100 > 13) {\
a.beginPath();\
a.globalAlpha = 0.9;\
a.lineWidth = 15;\
if (window.agar.myCells.indexOf(this.id) != - 1) {\
a.strokeStyle = '#FFFFFF';\
} else if (this.size > Math.sqrt(2) * size_margin / 0.85) {\
a.strokeStyle = '#FF0000';\
} else if (this.size > size_margin / 0.85) {\
a.strokeStyle = '#FF7F00';\
} else if (this.size > size_margin * 0.85) {\
a.strokeStyle = '#FFFF00';\
} else if (this.size > size_margin / Math.sqrt(2) * 0.85) {\
a.strokeStyle = '#008000';\
} else {\
a.strokeStyle = '#ADD8E6';\
}\
a.arc(this.x, this.y, this.size + 25, 0, Math.PI * 2, false);\
a.closePath();\
a.stroke();\
a.lineWidth = 10;\
}\
}\
if (window.agar.enableSplitGuides) {\
if ((this.size >= Math.sqrt(2) * window.agar.myCellsMin / 0.85) || (this.size >= 60 && window.agar.myCells.indexOf(this.id) != - 1) || this.isVirus) {\
a.globalAlpha = 0.8;\
if (window.bakaconf !== undefined) {\
a.lineWidth = window.bakaconf.splitGuideWidth;\
}\
a.strokeStyle = (window.agar.myCells.indexOf(this.id) == - 1 ? '#FF0000' : '#FFFFFF');\
if (this.isVirus) {\
a.strokeStyle = '#7CFC00'\
}\
a.beginPath();\
a.arc(this.x, this.y, this.size + Math.max(760, this.size) + this.size, 0, 2 * Math.PI, !1);\
a.closePath();\
a.stroke();\
if (window.agar.myCells.indexOf(this.id) != - 1) {\
a.globalAlpha = 0.4;\
a.beginPath();\
a.arc(this.x, this.y, this.size + Math.max(760, this.size), 0, 2 * Math.PI, !1);\
a.closePath();\
a.stroke();\
}\
a.lineWidth = 10;\
a.globalAlpha = 1;\
}\
}\
" + "$&")
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
