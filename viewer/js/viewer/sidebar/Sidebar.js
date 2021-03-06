define([
    'dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',

    'dojo/_base/lang',
    'dojo/_base/array',
    'dojo/query',
    'dojo/dom-class',
    'dojo/dom-geometry',
    'dojo/on',
    'dojo/aspect',

    'dijit/registry',

    'put-selector/put',

    'dojo/text!./templates/Sidebar.html',

    'xstyle/css!./css/Sidebar.css',

    'dojo/NodeList-traverse'

], function (
    declare,
    _WidgetBase,
    _TemplatedMixin,

    lang,
    array,
    query,
    domClass,
    domGeom,
    on,
    aspect,

    registry,

    put,

    template
) {
    return declare([_WidgetBase, _TemplatedMixin], {
        templateString: template,
        baseClass: 'sidebar',

        defaultTabParams: {
            title: 'Title',
            iconClass: 'fa-bars'
        },

        viewPadding: {
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
        },

        showCloseIcon: true,

        collapseSyncNode: null,

        postCreate: function () {
            this.inherited(arguments);

            this.tabs = [];
            if (this.collapseSyncNode) {
                if (domClass.contains(this.domNode, 'collapsed')) {
                    put(this.mapContainer, '.sidebar-collapsed');
                }
                //wire up css transition callback covering all event name bases
                on(this.collapseSyncNode, 'transitionend, oTransitionEnd, webkitTransitionEnd, animationend, webkitAnimationEnd', lang.hitch(this, '_setViewPadding'));
            }
            aspect.before(this.map, 'setExtent', lang.hitch(this, '_viewPaddingHandler'));

            // resize tab and any widgets within the tab when it is opened
            on(this.domNode, 'transitionend, oTransitionEnd, webkitTransitionEnd, animationend, webkitAnimationEnd', lang.hitch(this, '_resizeActiveTab'));


            // resize tab and any widgets within the tab when the browser is resized
            on(window, 'resize', lang.hitch(this, function () {
                window.setTimeout(lang.hitch(this, '_resizeActiveTab'), 300); // 300ms to wait for the animation to complete
            }));

        },

        createTab: function (options) {
            options = lang.mixin(lang.clone(this.defaultTabParams), options || {});
            var tab = {
                id: options.id,
                buttonNode: null,
                containerNode: null,
                titleNode: null,
                closeBtnNode: null,
                contentNode: null
            };
            //create and place dom elements for the tab button and pane
            tab.buttonNode = put(this.tabsButtonNode, 'li a[role=tab] i.fa.' + options.iconClass + '<<');
            tab.containerNode = put(this.tabsContainerNode, 'div.' + this.baseClass + '-pane');
            tab.titleNode = put(tab.containerNode, 'div.' + this.baseClass + '-pane-title $', options.title);

            if (this.showCloseIcon) {
                tab.closeBtnNode = put(tab.titleNode, 'i.fa.fa-chevron-left.' + this.baseClass + '-closeIcon');
                // listen for the tab close button click
                on(tab.closeBtnNode, 'click', lang.hitch(this, 'tabClickHandler', tab));
            }

            // listen for the tab button click
            on(tab.buttonNode, 'click', lang.hitch(this, 'tabClickHandler', tab));

            //keep a reference to this tab
            this.tabs.push(tab);

            //return the tabs pane node
            return tab;
        },

        openTab: function (tab) {
            array.forEach(this.tabs, function (childTab) {
                put(childTab.buttonNode, '!active');
                put(childTab.containerNode, '!active');
                put(childTab.contentNode, '!active');
            });
            put(tab.buttonNode, '.active');
            put(tab.containerNode, '.active');
            put(tab.contentNode, '.active');
            put(this.tabsButtonNode, '.active');
            put(this.domNode, '!collapsed');
            put(this.mapContainer, '!sidebar-collapsed');
        },

        closeTab: function () {
            array.forEach(this.tabs, function (tab) {
                put(tab.buttonNode, '!active');
                put(tab.containerNode, '!active');
                put(tab.contentNode, '!active');
            }, this);
            put(this.tabsButtonNode, '!active');
            put(this.domNode, '.collapsed');
            put(this.mapContainer, '.sidebar-collapsed');
        },

        tabClickHandler: function (tab) {
            if (domClass.contains(tab.buttonNode, 'active')) {
                this.closeTab(tab);
            } else {
                this.openTab(tab);
            }
        },

        _setViewPadding: function () {
            var dims = domGeom.getContentBox(this.domNode);
            this.viewPadding = {
                top: 0,
                left: dims.w + dims.l,
                right: 0,
                bottom: 0
            };
            this._viewPaddingHandler(this.map.extent);
        },

        _viewPaddingHandler: function (extent) {
            var map = this.map,
                vp = this.viewPadding,
                w = map.width - vp.left - vp.right,
                h = map.height - vp.top - vp.bottom,
                res = Math.max(extent.getWidth() / w, extent.getHeight() / h),
                center = extent.getCenter(),
                result = map.extent.expand(res / (map.extent.getWidth() / map.width));
            result = result.centerAt({
                x: center.x - (vp.left - vp.right) * 0.5 * res,
                y: center.y - (vp.top - vp.bottom) * 0.5 * res
            });
            return [result];
        },

        _resizeActiveTab: function () {
            var childTabs = array.filter(this.tabs, function (tab) {
                return domClass.contains(tab.contentNode, 'active');
            });
            if (childTabs && childTabs.length > 0) {
                var contentNode = query(childTabs[0].contentNode);
                this._resizeWidgetsInNodeList(contentNode);
                var children = contentNode.children();
                this._resizeWidgetsInNodeList(children);
            }
        },

        _resizeWidgetsInNodeList: function (nodes) {
            array.forEach(nodes, function (node) {
                // resize any widgets
                var childWidgets = registry.findWidgets(node);
                array.forEach(childWidgets, function (widget) {
                    if (widget.resize && typeof(widget.resize) === 'function') {
                        window.setTimeout(function () {
                            widget.resize();
                        }, 50);
                    }
                });

            });
        }
    });
});