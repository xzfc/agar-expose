// ==UserScript==
// @name        Agar.io Expose
// @version     1.1
// @namespace   xzfc
// @updateURL   https://raw.githubusercontent.com/xzfc/agar-expose/master/expose.user.js
// @include     http://agar.io/
// @run-at      document-start
// @grant       none
// ==/UserScript==

if (window.top != window.self)
    return;

var observer = new MutationObserver(function(mutations) {
    for (var i = 0; i < mutations.length; i++) {
        if (/^http:\/\/agar\.io\/main_out\.js/.test(mutations[i].addedNodes[0].src)) {
            document.head.removeChild(mutations[i].addedNodes[0]);
            observer.disconnect();
            runRequest();
            break;
        }
    }
});
observer.observe(document.head, {childList: true});

function runRequest() {
    var request = new XMLHttpRequest();
    request.onload = function() {
        handleResponse(this.responseText);
    };
    request.onerror = function() {
        console.log("Response was null");
    };
    request.open("get", "http://agar.io/main_out.js", true);
    request.send();
}

function handleResponse(response) {
    var cutStrings = response.match(/(\w+)\.push\(this\);/);
    var split = response.split(cutStrings[0]);
    response = "window.agar={};" + split[0] + cutStrings[0] + "window.agar.allCells=" + cutStrings[1] + ";window.agar.myCells=B;window.agar.top=y;window.agar.top_teams=u;window.agar.ws = m.url;" + split[1];
    var script = document.createElement("script");
    script.innerHTML = response;
    insertScript(script);
}

function insertScript(script) {
    if (typeof jQuery === "undefined") {
        return setTimeout(insertScript, 0, script);
    }
    document.head.appendChild(script);
}
