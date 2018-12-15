function log(msg) {
    print("KWinMax2NewVirtualDesktop: " + msg);
}

/*
 * Enum that should match the config in main.xml
 */
const TriggerValues = {
    FullscreenOnly: 0,
    MaximizeOnly: 1,
    FullscreenAndMaximize: 2
};
/*
 * Enum that should match the config in main.xml
 */
const NewDesktopPositionValue = {
    RightMost: 0,
    NextToCurrent: 1,
    NextToApp: 2,
};

function Config() {
}

Config.prototype.trigger = function() {
    var v = readConfig('trigger', 'FullscreenOnly');
    return TriggerValues[v];
};

Config.prototype.newDesktopPosition = function() {
    var v = readConfig("newDesktopPosition", 'RightMost');
    return NewDesktopPositionValue[v];
};

Config.prototype.keepNonEmptyDesktop = function() {
    var v = readConfig("keepNonEmptyDesktop", false);
    // convert to primitive value
    return Boolean.prototype.valueOf(v);
};

Config.prototype.blockWMClass = function() {
    var classes = readConfig("blockWMClass", "").toString();
    classes = classes.split(",");
    return classes;
};

function State() {
    this.savedDesktops = {};
    this.enabled = true;

    // cached config values
    this.cachedConfig = {
        trigger: TriggerValues.FullscreenOnly,
        newDesktopPosition: NewDesktopPositionValue.RightMost,
        keepNonEmptyDesktop: false,
        blockWMClass: []
    };

    var config = new Config();
    this.reload = function () {
        this.cachedConfig.trigger = config.trigger();
        this.cachedConfig.newDesktopPosition = config.newDesktopPosition();
        this.cachedConfig.keepNonEmptyDesktop = config.keepNonEmptyDesktop();
        this.cachedConfig.blockWMClass = config.blockWMClass();
    };

    this.reload();
}

State.prototype.isTriggeredByFull = function() {
    return this.cachedConfig.trigger === TriggerValues.FullscreenOnly
        || this.cachedConfig.trigger === TriggerValues.FullscreenAndMaximize;
}

State.prototype.isTriggeredByMax = function() {
    return this.cachedConfig.trigger === TriggerValues.MaximizeOnly
        || this.cachedConfig.trigger === TriggerValues.FullscreenAndMaximize;
}

State.prototype.isKnownClient = function(client) {
    return this.savedDesktops.hasOwnProperty(client.windowId);
}

State.prototype.isSkippedClient = function (client) {
    var idx = this.cachedConfig.blockWMClass.indexOf(client.resourceClass.toString());
    return idx != -1;
}

State.prototype.getNextDesktop = function (client) {
    switch (this.cachedConfig.newDesktopPosition) {
        case NewDesktopPositionValue.RightMost:
            log('RightMost, workspace.desktops is ' + workspace.desktops);
            return workspace.desktops + 1;
        case NewDesktopPositionValue.NextToCurrent:
            log('NextToCurrent, workspace.currentDesktop is ' + workspace.currentDesktop);
            return workspace.currentDesktop + 1;
        case NewDesktopPositionValue.NextToApp:
            log('NextToApp, client.desktop is ' + client.desktop);
            return client.desktop + 1;
        default:
            log('default, workspace.desktops is ' + workspace.desktops);
            return workspace.desktops + 1;
    }
}

// If the desktop at pos can be removed
State.prototype.shouldRemoveDesktop = function(pos) {
    if (pos <= 0) {
        return false;
    }

    if (!this.cachedConfig.keepNonEmptyDesktop) {
        return true;
    }

    // only remove if the desktop is empty
    var count = 0;
    const clients = workspace.clientList();
    for (var i = 0; i < clients.length; i++) {
        if (clients[i].desktop == pos) {
            count++;
        }
    }
    return count == 0;
};

State.prototype.debugDump = function() {
    log('');
    log('state: enabled ' + this.enabled);
    log('state: triggerFull ' + this.isTriggeredByFull());
    log('state: triggerMax ' + this.isTriggeredByMax());
    log('state: cachedConfig: ' + JSON.stringify(this.cachedConfig));
    log('state: savedDesktops size ' + Object.keys(this.savedDesktops).length);
    for (var client in this.savedDesktops) {
        log('state: savedDesktops: ' + client + ' => ' + this.savedDesktops[client]);
    }
    log('workspace: activeClient is ' + workspace.activeClient);
    log('');
}

function Main() {
    this.state = new State();

    // signal handler's this will be the global object
    var self = this;

    this.handlers = {
        fullscreen: function(client, full) {
            log('handle fullscreen');
            self.state.debugDump();
            if (!self.state.isTriggeredByFull() || self.state.isSkippedClient(client)) {
                log('handle fullscreen return');
                return;
            }
            if (full) {
                self.moveToNewDesktop(client);
            } else {
                log("moving back: " + client.caption);
                self.moveBack(client);
            }
            self.state.debugDump();
            log('handle fullscreen done');
        },

        maximize: function(client, h, v) {
            log('handle maximize');
            self.state.debugDump();
            if (!self.state.isTriggeredByMax() || self.state.isSkippedClient(client)) {
                log('handle maximize return');
                return;
            }
            if (h && v) {
                self.moveToNewDesktop(client);
            } else {
                self.moveBack(client);
            }
            self.state.debugDump();
            log('handle maximize done');
        },

        closed: function(client) {
            log('handle remove');
            self.state.debugDump();
            if (!self.state.isKnownClient(client)) {
                log('handle remove return');
                return;
            }
            self.moveBack(client, true);
            self.state.debugDump();
            log('handle remove done');
        },

        createUserActionsMenu: function(client) {
            log("Creating user menu");
            self.state.debugDump();
            return {
                text: "Maximize to New Desktop",
                items: [
                    {
                        text: "Enabled",
                        checkable: true,
                        checked: self.state.enabled,
                        triggered: function() {
                            self.state.enabled = !self.state.enabled;
                            if (self.state.enabled) {
                                self.install();
                            } else {
                                self.uninstall();
                            }
                        }
                    },
                    {
                        text: 'FullTriggered',
                        checkable: true,
                        checked: self.state.isTriggeredByFull(),
                        triggered: function () {
                            return;
                        }
                    },
                    {
                        text: 'MaxTriggered',
                        checkable: true,
                        checked: self.state.isTriggeredByMax(),
                        triggered: function () {
                            return;
                        }
                    },
                    {
                        text: 'KeepNonEmpty',
                        checkable: true,
                        checked: self.state.cachedConfig.keepNonEmptyDesktop,
                        triggered: function () {
                            return;
                        }
                    },
                ]
            }
        }
    }
}

// shift clients' desktop on desktop [from, to], to direction
Main.prototype.shiftClients = function (direction, from, to) {
    to = typeof to !== 'undefined' ? to : workspace.desktops;

    // note that client.desktop is 1-based.
    const clients = workspace.clientList();
    for (var i = 0; i < clients.length; i++) {
        if (clients[i].desktop >= from && clients[i].desktop <= to) {
            clients[i].desktop += direction;
        }
    }
    // also updated saved desktop info
    for (var clientId in this.state.savedDesktops) {
        if (this.state.savedDesktops[clientId] >= from
            && this.state.savedDesktops[clientId] <= to) {
            this.saved.savedDesktops[clientId] += direction;
        }
    }
}

// Insert a new desktop at pos and switch to it, which is 1-based.
// if pos > workspace.desktops, new desktops will be created
// if pos <= workspace.desktops, new desktops will be created at end
// and clients will be shifted
Main.prototype.insertDesktop = function (pos) {
    log("Inserting a desktop at " + pos);
    // save old current
    var oldCurrent = workspace.currentDesktop;
    if (oldCurrent >= pos) {
        oldCurrent += 1;
    }

    if (pos > workspace.desktops) {
        workspace.desktops = pos;
    } else {
        // add one desktop and shift clients
        workspace.desktops += 1;
        this.shiftClients(+1, pos);
    }

    // switch to new desktop
    workspace.currentDesktop = pos;

    return pos;
}

// remove desktop at pos, shifting clients as needed
Main.prototype.popDesktop = function (pos) {
    log('popDesktop: ' + pos);
    if (pos > workspace.desktops) {
        log('popDesktop: pos > workspace.desktops: ' + workspace.desktops);
        return;
    }

    if (!this.state.shouldRemoveDesktop(pos)) {
        log('popDesktop: should not remove desktop');
        return;
    }

    if (pos == workspace.desktops) {
        log('popDesktop: removing');
        workspace.desktops -= 1;
    } else {
        log('popDesktop: shifting');
        this.shiftClients(-1, pos);
        log('popDesktop: removing');
        workspace.desktops -= 1;
    }
}

Main.prototype.moveToNewDesktop = function(client) {
    this.state.savedDesktops[client.windowId] = client.desktop;

    // register the client's windowClosed event
    // we cannot use the global clientRemoved event, which is called
    // after cleanGrouping of the client, and will cause crash of kwin
    client.windowClosed.connect(this.handlers.closed);

    var next = this.state.getNextDesktop(client);
    this.insertDesktop(next);
    client.desktop = next;

    // make sure the client is activated
    workspace.activeClient = client;
}

Main.prototype.moveBack = function(client, removed) {
    removed = typeof removed !== "undefined" ? removed : false;

    if (!this.state.isKnownClient(client)) {
        log("Ignoring window not previously seen: " + client.caption);
        return;
    }

    log("inside moving back: " + client.caption);
    var saved = this.state.savedDesktops[client.windowId];
    delete this.state.savedDesktops[client.windowId];

    // unregister the client's windowClosed event
    client.windowClosed.disconnect(this.handlers.closed);

    var toRemove = client.desktop;

    log("Resotre client desktop to " + saved);
    workspace.currentDesktop = saved;

    client.desktop = saved;
    if (!removed) {
        workspace.activeClient = client;
    }

    this.popDesktop(toRemove);
}

Main.prototype.install = function() {
    workspace.clientFullScreenSet.connect(this.handlers.fullscreen);
    workspace.clientMaximizeSet.connect(this.handlers.maximize);
    log("Handler installed");
}

Main.prototype.uninstall = function() {
    workspace.clientFullScreenSet.disconnect(this.handlers.fullscreen);
    workspace.clientMaximizeSet.disconnect(this.handlers.maximize);
    log("Handler cleared");
}

Main.prototype.init = function() {
    // this.state.debugDump();
    // registerUserActionsMenu(this.handlers.createUserActionsMenu);
    // this.state.debugDump();
    this.install();
};

main = new Main();
main.init();