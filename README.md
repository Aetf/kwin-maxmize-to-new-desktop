# kwin-maxmize-to-new-desktop
KWin script that moves fullscreened window to a new virtual desktop, emulating macOS like maximize to new desktop. [Link to KDE Store page](https://store.kde.org/p/1171196/).

## Screenshot
![Screenshot](doc/screenshot.gif)

## Feature

* Move window to a newly created virtual desktop when fullscreen.
* Move window back to original desktop when restored to normal size or closed.

__Note__:
This is triggered by window **FULLSCREEN**, not the normal maximize. Window fullscreen can be enabled by right clicking on the window decoration -> `More Actions` -> `Fullscreen`.

Web browsers also enters fullscreen mode when the web page requests so, like clicking on fullscreen button in videos. In Firefox or Chrome, pressing `F11` also triggeres this.

## Change Log
See [CHANGELOG.md](CHANGELOG.md).
