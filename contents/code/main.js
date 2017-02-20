var savedDesktops = {};
function handler(client, full, user) {
    if (full) {
        savedDesktops[client.windowId] = client.desktop;

        var next = workspace.desktops + 1;
        workspace.desktops = next;
        client.desktop = next;
        workspace.currentDesktop = next;
        workspace.activateClient = client;
    } else {
        var saved = savedDesktops[client.windowId];
        if (saved === undefined) {
            print("Old info not found");
        } else {
            print("Resotre client desktop to " + saved);
            client.desktop = saved;
            workspace.currentDesktop = saved;
            workspace.activateClient = client;

            workspace.desktops -= 1;
        }
    }
}
workspace.clientFullScreenSet.connect(handler)
registerUserActionsMenu(function(client){
    print("Registering menu for client " + client.caption);
    return {
        text: "Maximize helper",
        items: [
            {
                text: "Uninstall",
                checkable: false,
                checked: false,
                triggered: function(act) {
                    workspace.clientFullScreenSet.disconnect(handler);
                    print("Handler cleared");
                }
            }, {
                text: "Install",
                checkable: false,
                checked: false,
                triggered: function(act) {
                    workspace.clientFullScreenSet.connect(handler);
                    print("Handler installed");
                }
            }
        ]
    };
});
print("Done");
