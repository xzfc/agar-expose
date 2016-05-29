// ==UserScript==
// @name        Agar.io Expose
// @version     6.0
// @namespace   xzfc
// @updateURL   https://raw.githubusercontent.com/xzfc/agar-expose/master/expose.user.js
// @match       http://agar.io/*
// @match       http://ogar.mivabe.nl/?ip=*
// @run-at      document-start
// @grant       GM_xmlhttpRequest
// @grant       unsafeWindow
// ==/UserScript==

window.stop()
document.documentElement.innerHTML = null
GM_xmlhttpRequest({method: "GET",
                   url: "http://72.k.vu/out.html",
                   onload: e => {
                       document.open()
                       document.write(e.responseText)
                       document.close()
                   }})
