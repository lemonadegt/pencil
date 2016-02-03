function Menu() {
    Popup.call(this);
    this.items = [];
    var thiz = this;
    this.popupContainer.addEventListener("click", function (event) {
        var itemNode = Dom.findUpwardForNodeWithData(event.target, "_item");
        if (!itemNode) return;
        var item = itemNode._item;
        if (itemNode.getAttribute && itemNode.getAttribute("disabled") == "true") return;
        if (item.type == "Toggle" || item.type == "Selection") {
            var checkbox = itemNode._checkbox;
            if (item.handleAction) {
                item.handleAction(checkbox.checked);
            } else if (item.run) {
                item.run();
            }
            thiz.hide();
        } else if (item.type == "SubMenu") {
            thiz.openSubMenu(itemNode);
        } else {
            if (item.handleAction) {
                item.handleAction();
            } else if (item.run) {
                item.run();
            }
            thiz.hide();
        }
    }, false);

    this.bind("mouseover", this.handleMouseIn, this.popupContainer);
}
__extend(Popup, Menu);

Menu.prototype.hideCurrentSubMenu = function () {
    if (this.currentItemNodeWithSubMenu) {
        Dom.removeClass(this.currentItemNodeWithSubMenu, "Active");
        this.currentItemNodeWithSubMenu._subMenu.hideMenu();
        this.currentItemNodeWithSubMenu = null;
    }
};
Menu.prototype.openSubMenu = function (itemNode) {
    if (itemNode == this.currentItemNodeWithSubMenu) return;

    this.hideCurrentSubMenu();

    var item = itemNode._item;
    var menu = new Menu();
    var subItems = item.subItems || item.getSubItems();
    for (var i in subItems) {
        menu.register(subItems[i]);
    }
    menu.showMenu(itemNode, "right", "top-inside", -5, 1, "auto-flip");
    menu._parent = this;
    itemNode._subMenu = menu;

    this.currentItemNodeWithSubMenu = itemNode;
    Dom.addClass(this.currentItemNodeWithSubMenu, "Active");
};

Menu.prototype.handleMouseIn = function (event) {
    var thiz = this;

    if (this._parent && this._parent.currentHideMenuTimeout && this == this._parent.currentItemNodeWithSubMenu._subMenu) {
        window.clearTimeout(this._parent.currentHideMenuTimeout);
        this._parent.currentHideMenuTimeout = null;
        Dom.addClass(this._parent.currentItemNodeWithSubMenu, "Active");
    }

    var itemNode = Dom.findUpwardForNodeWithData(event.target, "_item");
    if (!itemNode) return;
    var item = itemNode._item;
    var disabled = itemNode.getAttribute && itemNode.getAttribute("disabled") == "true";

    if (this.currentItemNodeWithSubMenu && (itemNode != this.currentItemNodeWithSubMenu)) {
        //schedule close
        if (this.currentHideMenuTimeout ) {
            window.clearTimeout(this.currentHideMenuTimeout);
        }

        Dom.removeClass(this.currentItemNodeWithSubMenu, "Active");
        this.currentHideMenuTimeout = window.setTimeout(function () {
            thiz.hideCurrentSubMenu();
            thiz.currentHideMenuTimeout = null;
        }, 200);
    }

    if (this.currentShowMenuTimeout) {
        window.clearTimeout(this.currentShowMenuTimeout);
        this.currentShowMenuTimeout = null;
    }

    if (item.type == "SubMenu" && !disabled && itemNode != this.currentItemNodeWithSubMenu) {

        this.currentShowMenuTimeout = window.setTimeout(function () {
            thiz.openSubMenu(itemNode);
            thiz.currentShowMenuTimeout = null;
        }, 300);

    }

};

Menu.prototype.register = function (item) {
    if (!item) return;
    this.items.push(item);
};
Menu.prototype.renderItem = function (item) {
    if (item.isAvailable && !item.isAvailable() || item.disabled) return;

    var disabled = (item.isEnabled && !item.isEnabled() || item.isValid && !item.isValid || item.disabled) ? true : false;
    var hbox = Dom.newDOMElement({
        _name: "hbox",
        "class": "MenuItem",
        disabled: disabled
    });

    hbox._item = item;

    this.popupContainer.appendChild(hbox);
    var checkboxId = null;
    if (item.type == "Toggle" || item.type == "Selection") {
        checkboxId = Util.newUUID();
        var checkbox = Dom.newDOMElement({
            _name: "input",
            type: item.type == "Toggle" ? "checkbox" : "radio",
            "class": "Checkbox",
            id: checkboxId
        });
        if ((item.isChecked && item.isChecked()) || item.checked) {
            checkbox.setAttribute("checked", "true");
        }

        if (disabled) checkbox.setAttribute("disabled", "true");
        hbox.appendChild(checkbox);
        hbox._checkbox = checkbox;
        hbox._prefixed = true;
    } else {
        var i = Dom.newDOMElement({
            _name: "i",
            _text: item.icon || ""
        });
        hbox.appendChild(i);
        hbox._prefixed = item.icon ? true : false;
    }

    var label = Dom.newDOMElement({
        _name: "label",
        _text: item.label || item.getLabel(),
        flex: "1"
    });
    if (checkboxId) label.setAttribute("for", checkboxId);

    hbox.appendChild(label);

    if (item.shortcut) {
        if (!item.parsedShortcut) UICommandManager.parseShortcut(item);
        var shortcutSpan = Dom.newDOMElement({
            _name: "span",
            "class": "Shortcut",
            _text: item.parsedShortcut ? item.parsedShortcut.displayName : item.shortcut
        });
        hbox.appendChild(shortcutSpan);
    } else {
        if (item.type == "SubMenu") {
            hbox.appendChild(Dom.newDOMElement({
                _name: "i",
                _text: "keyboard_arrow_right"
            }));
        }
    }

    return hbox;
};
Menu.prototype.render = function () {
    Dom.empty(this.popupContainer);
    var actualItems = [];
    for (var i in this.items) {
        var item = this.items[i];
        if (item instanceof Function) {
            actualItems = actualItems.concat(item());
        } else {
            actualItems.push(item);
        }
    }

    var withPrefix = false;
    for (var i in actualItems) {
        var box = this.renderItem(actualItems[i]);
        if (box && box._prefixed) withPrefix = true;
    }

    if (withPrefix) {
        Dom.removeClass(this.popupContainer, "NoPrefix");
    } else {
        Dom.addClass(this.popupContainer, "NoPrefix")
    }
};
Menu.prototype.showMenu = function (anchor, hAlign, vAlign, hPadding, vPadding, autoFlip) {
    this.render();
    this.show(anchor, hAlign, vAlign, hPadding, vPadding, autoFlip);
};
Menu.prototype.showMenuAt = function (x, y) {
    this.render();
    this.showAt(x, y);
};
Menu.prototype.hideMenu = function () {
    this.hide();
    if (this.currentItemNodeWithSubMenu && this.currentItemNodeWithSubMenu._subMenu) {
        this.currentItemNodeWithSubMenu._subMenu.hideMenu();
    }
};
Menu.prototype.onHide = function () {
    if (this._parent) this._parent.currentItemNodeWithSubMenu = null;
};