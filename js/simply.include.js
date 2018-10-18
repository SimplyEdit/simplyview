this.simply = (function (simply, global) {

    var throttle = function( callbackFunction, intervalTime ) {
        var eventId = 0;
        return function() {
            var myArguments = arguments;
            var me = this;
            if ( eventId ) {
                return;
            } else {
                eventId = global.setTimeout( function() {
                    callbackFunction.apply(me, myArguments);
                    eventId = 0;
                }, intervalTime );
            }
        };
    };

    var runWhenIdle = (function() {
        if (global.requestIdleCallback) {
            return function(callback) {
                global.requestIdleCallback(callback, {timeout: 500});
            };
        }
        return global.requestAnimationFrame;
    })();

    var rebaseHref = function(relative, base) {
        if (/^[a-z-]*:?\//.test(relative)) {
            return relative; // absolute href, no need to rebase
        }

        var stack = base.split('/'),
            parts = relative.split('/');
        stack.pop(); // remove current file name (or empty string)
        for (var i=0; i<parts.length; i++) {
            if (parts[i] == '.')
                continue;
            if (parts[i] == '..')
                stack.pop();
            else
                stack.push(parts[i]);
        }
        return stack.join('/');
    };

    var observer, loaded = {};
    var head = document.documentElement.querySelector('head');
    var currentScript = document.currentScript;

    var waitForPreviousScripts = function() {
        // because of the async=false attribute, this script will run after
        // the previous scripts have been loaded and run
        // simply.include.next.js only fires the simply-next-script event
        // that triggers the Promise.resolve method
        return new Promise(function(resolve) {
            global.setTimeout(function() {
                var next = document.createElement('script');
                var cachebuster = Date.now();
                next.src = rebaseHref('simply.include.next.js?'+cachebuster, currentScript.src);
                next.setAttribute('async', false);
                document.addEventListener('simply-include-next', function() {
                    head.removeChild(next);
                    resolve();
                }, { once: true, passive: true});
                head.appendChild(next);
            }, 10);
        });
    };

    var scriptLocations = [];

    simply.include = {
        scripts: function(scripts, base) {
            var arr = [];
            for(var i = scripts.length; i--; arr.unshift(scripts[i]));
            var importScript = function() {
                var script = arr.shift();
                if (!script) {
                    return;
                }
                var attrs  = [].map.call(script.attributes, function(attr) {
                    return attr.name;
                });
                var clone  = document.createElement('script');
                attrs.forEach(function(attr) {
                    clone.setAttribute(attr, script[attr]);
                });
                clone.removeAttribute('data-simply-location');
                if (!clone.src) {
                    // this is an inline script, so copy the content and wait for previous scripts to run
                    clone.innerHTML = script.innerHTML;
                    waitForPreviousScripts()
                        .then(function() {
                            var node = scriptLocations[script.dataset.simplyLocation];
                            node.parentNode.insertBefore(clone, node);
                            node.parentNode.removeChild(node);
                            global.setTimeout(importScript, 10);
                        });
                } else {
                    clone.src = rebaseHref(clone.src, base);
                    if (!clone.hasAttribute('async') && !clone.hasAttribute('defer')) {
                        clone.setAttribute('async', false);
                    }
                    var node = scriptLocations[script.dataset.simplyLocation];
                    node.parentNode.insertBefore(clone, node);
                    node.parentNode.removeChild(node);
                    loaded[clone.src]=true;
                    global.setTimeout(importScript, 10); // this settimeout is required, 
                    // when adding multiple scripts in one go, the browser has no idea of the order in which to load and execut them
                    // even with the async=false flag
                }
            };
            if (arr.length) {
                importScript();
            }
        },
        html: function(html, link) {
            var fragment = document.createRange().createContextualFragment(html);
            var stylesheets = fragment.querySelectorAll('link[rel="stylesheet"],style');
            // add all stylesheets to head
            [].forEach.call(stylesheets, function(stylesheet) {
                if (stylesheet.href) {
                    stylesheet.href = rebaseHref(stylesheet.href, link.href);
                }
                head.appendChild(stylesheet);
            });
            // remove the scripts from the fragment, as they will not run in the
            // order in which they are defined
            var scriptsFragment = document.createDocumentFragment();
            // FIXME: this loses the original position of the script
            // should add a placeholder so we can reinsert the clone
            var scripts = fragment.querySelectorAll('script');
            [].forEach.call(scripts, function(script) {
                var placeholder = document.createComment(script.src || 'inline script');
                script.parentNode.insertBefore(placeholder, script);
                script.dataset.simplyLocation = scriptLocations.length;
                scriptLocations.push(placeholder);
                scriptsFragment.appendChild(script);
            });
            // add the remainder before the include link
            link.parentNode.insertBefore(fragment, link ? link : null);
            global.setTimeout(function() {
                simply.include.scripts(scriptsFragment.childNodes, link ? link.href : global.location.href );
            }, 10);
        }
    };

    var included = {};
    var includeLinks = function(links) {
        // mark them as in progress, so handleChanges doesn't find them again
        var remainingLinks = [].reduce.call(links, function(remainder, link) {
            if (link.rel=='simply-include-once' && included[link.href]) {
                link.parentNode.removeChild(link);
            } else {
                included[link.href]=true;
                link.rel = 'simply-include-loading';
                remainder.push(link);
            }
            return remainder;
        }, []);
        [].forEach.call(remainingLinks, function(link) {
            if (!link.href) {
                return;
            }
            // fetch the html
            fetch(link.href)
                .then(function(response) {
                    if (response.ok) {
                        console.log('simply-include: loaded '+link.href);
                        return response.text();
                    } else {
                        console.log('simply-include: failed to load '+link.href);
                    }
                })
                .then(function(html) {
                    // if succesfull import the html
                    simply.include.html(html, link);
                    // remove the include link
                    link.parentNode.removeChild(link);
                });
        });
    };

    var handleChanges = throttle(function() {
        runWhenIdle(function() {
            var links = document.querySelectorAll('link[rel="simply-include"],link[rel="simply-include-once"]');
            if (links.length) {
                includeLinks(links);
            }
        });
    });

    var observe = function() {
        observer = new MutationObserver(handleChanges);
        observer.observe(document, {
            subtree: true,
            childList: true,
        });
    };

    observe();

    return simply;

})(this.simply || {}, this);
