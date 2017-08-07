var state = {
    savedDesktops: {},
    enabled: true
};

function log(msg) {
    print("KWinMax2NewVirtualDesktop: " + msg);
}

function moveToNewDesktop(client) {
    state.savedDesktops[client.windowId] = client.desktop;

    var next = workspace.desktops + 1;
    workspace.desktops = next;
    client.desktop = next;
    workspace.currentDesktop = next;
    workspace.activateClient = client;
}

function moveBack(client) {
    var saved = state.savedDesktops[client.windowId];
    if (saved === undefined) {
        log("Ignoring window not previously seen: " + client.caption);
    } else {
        log("Resotre client desktop to " + saved);
        client.desktop = saved;
        workspace.currentDesktop = saved;
        workspace.activateClient = client;

        workspace.desktops -= 1;
    }
}

function fullHandler(client, full, user) {
    if (full) {
        moveToNewDesktop(client);
    } else {
        moveBack(client);
    }
}

function rmHandler(client) {
    moveBack(client);
}

function install() {
    workspace.clientFullScreenSet.connect(fullHandler);
    workspace.clientRemoved.connect(rmHandler);
    log("Handler installed");
}

function uninstall() {
    workspace.clientFullScreenSet.disconnect(handler);
    workspace.clientRemoved.disconnect(rmHandler);
    log("Handler cleared");
}

registerUserActionsMenu(function(client){
    return {
        text: "Maximize to New Desktop",
        items: [
            {
                text: "Enabled",
                checkable: true,
                checked: state.enabled,
                triggered: function() {
                    state.enabled = !state.enabled;
                    if (state.enabled) {
                        install();
                    } else {
                        uninstall();
                    }
                }
            },
            /*
            {
                text: "Disable for this window",
                checkable: true,
                checked: false,
                triggered: function(act) {
                    log('Not implemented yet!');
                }
            }
            */
        ]
    };
});

install();
