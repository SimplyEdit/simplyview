window.simply = (function(simply) {
    var defaultActions = {
        'simply-hide': function(el) {
            el.classList.remove('simply-visible');
            return Promise.resolve();
        },
        'simply-show': function(el) {
            el.classList.add('simply-visible');
            return Promise.resolve();
        },
        'simply-select': function(el,group,target,targetGroup) {
            if (group) {
                this.call('simply-deselect', this.app.container.querySelectorAll('[data-simply-group='+group+']'));
            }
            el.classList.add('simply-selected');
            if (target) {
                this.call('simply-select',target,targetGroup);
            }
            return Promise.resolve();
        },
        'simply-toggle-select': function(el,group,target,targetGroup) {
            if (!el.classList.contains('simply-selected')) {
                this.call('simply-select',el,group,target,targetGroup);
            } else {
                this.call('simply-deselect',el,target);
            }
            return Promise.resolve();
        },
        'simply-toggle-class': function(el,className,target) {
            if (!target) {
                target = el;
            }
            return Promise.resolve(target.classList.toggle(className));
        },
        'simply-deselect': function(el,target) {
            if ( typeof el.length=='number' && typeof el.item=='function') {
                el = Array.prototype.slice.call(el);
            }
            if ( Array.isArray(el) ) {
                for (var i=0,l=el.length; i<l; i++) {
                    this.call('simply-deselect',el[i],target);
                    target = null;
                }
            } else {
                el.classList.remove('simply-selected');
                if (target) {
                    this.call('simply-deselect',target);
                }
            }
            return Promise.resolve();
        },
        'simply-fullscreen': function(target) {
            var methods = {
                'requestFullscreen':{exit:'exitFullscreen',event:'fullscreenchange',el:'fullscreenElement'},
                'webkitRequestFullScreen':{exit:'webkitCancelFullScreen',event:'webkitfullscreenchange',el:'webkitFullscreenElement'},
                'msRequestFullscreen':{exit:'msExitFullscreen',event:'MSFullscreenChange',el:'msFullscreenElement'},
                'mozRequestFullScreen':{exit:'mozCancelFullScreen',event:'mozfullscreenchange',el:'mozFullScreenElement'}
            };
            for ( var i in methods ) {
                if ( typeof document.documentElement[i] != 'undefined' ) {
                    var requestMethod = i;
                    var cancelMethod = methods[i].exit;
                    var event = methods[i].event;
                    var element = methods[i].el;
                    break;
                }
            }
            if ( !requestMethod ) {
                return;
            }
            if (!target.classList.contains('simply-fullscreen')) {
                target.classList.add('simply-fullscreen');
                target[requestMethod]();
                var exit = function() {
                    if ( !document[element] ) {
                        target.classList.remove('simply-fullscreen');
                        document.removeEventListener(event,exit);
                    }
                };
                document.addEventListener(event,exit);
            } else {
                target.classList.remove('simply-fullscreen');
                document[cancelMethod]();
            }
            return Promise.resolve();
        }
    };

    simply.action = function(app, inActions) {
        var actions = Object.create(defaultActions);
        for ( var i in inActions ) {
            actions[i] = inActions[i];
        }

        actions.app = app;
        actions.call = function(name) {
            var params = Array.prototype.slice.call(arguments);
            params.shift();
            return this[name].apply(this, params);
        };
        return actions;
    };

    return simply;
    
})(window.simply || {});
