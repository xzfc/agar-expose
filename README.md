# Agar.io Expose
## What is it?

[![Join the chat at https://gitter.im/xzfc/agar-expose](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/xzfc/agar-expose?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
Agar.io Expose — helper script for agar.io modding.
It allows you access to game state (e.g., visible cell positions and names, and much more) inside your mods.

## How to use it?
Just install [`expose.user.js`][raw link] using [Tampermonkey][] (Google Chrome) or [Greasemonkey][] (Firefox).
After then, you will be able to access internal agar's variables using `window.agar` object.
See [project wiki][] for an API reference.

## ~~~
This mod is released under the terms of MIT license.
Contributions are welcome.
Thanks `JRobH` for the [original expose][].


[raw link]: https://github.com/xzfc/agar-expose/raw/master/expose.user.js
[Tampermonkey]: https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo
[Greasemonkey]: https://addons.mozilla.org/en-us/firefox/addon/greasemonkey/
[project wiki]: https://github.com/xzfc/agar-expose/wiki
[original expose]: https://gist.github.com/JRobH/818103d83d0b43c7492f
