// ==UserScript==
// @name         Agar.io Expose
// @match        http://agar.io/
// @run-at       document-start
// @version      1.0
// @grant        none
// ==/UserScript==

var observer = new MutationObserver(function(mutations) {
    for (var i = 0; i < mutations.length; i++) {
        if (/^http:\/\/agar\.io\/main_out\.js/.test(mutations[i].addedNodes[0].src)) {
            document.head.removeChild(mutations[i].addedNodes[0]);
            observer.disconnect();
            break;
        }
    }
});
observer.observe(document.head, {childList: true});

var request = new XMLHttpRequest();
request.onload = function() {
    handleResponse(this.responseText);
};
request.onerror = function() {
    console.log("Response was null");
};
request.open("get", "http://agar.io/main_out.js", true);
request.send();

function handleResponse(response) {
    var cutStrings = response.match(/(\w+)\.push\(this\);/);
    var split = response.split(cutStrings[0]);
    response = split[0] + cutStrings[0] + "window.agar.allCells=" + cutStrings[1] + ";window.agar.myCells=B;window.agar.top=y;" + split[1];
    var script = document.createElement("script");
    script.innerHTML = response;
    insertScript(script);
}

function insertScript(script) {
    if (typeof jQuery === "undefined") {
        return setTimeout(insertScript, 0, script);
    }
    window.agar = {}
    document.head.appendChild(script);
}
