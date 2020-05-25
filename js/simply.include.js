(function (global) {
    'use strict';

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
    var head = global.document.querySelector('head');
    var currentScript = global.document.currentScript;

    var waitForPreviousScripts = function() {
        // because of the async=false attribute, this script will run after
        // the previous scripts have been loaded and run
        // simply.include.next.js only fires the simply-next-script event
        // that triggers the Promise.resolve method
        return new Promise(function(resolve) {
            var next = global.document.createElement('script');
            next.src = rebaseHref('simply.include.next.js', currentScript.src);
            next.async = false;
            global.document.addEventListener('simply-include-next', function() {
                head.removeChild(next);
                resolve();
            }, { once: true, passive: true});
            head.appendChild(next);
        });
    };

    var scriptLocations = [];

    var include = {
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
                var clone  = global.document.createElement('script');
                attrs.forEach(function(attr) {
                    clone.setAttribute(attr, script.getAttribute(attr));
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
                            importScript();
                        });
                } else {
                    clone.src = rebaseHref(clone.src, base);
                    if (!clone.hasAttribute('async') && !clone.hasAttribute('defer')) {
                        clone.async = false; //important! do not use clone.setAttribute('async', false) - it has no effect
                    }
                    var node = scriptLocations[script.dataset.simplyLocation];
                    node.parentNode.insertBefore(clone, node);
                    node.parentNode.removeChild(node);
                    loaded[clone.src]=true;
                    importScript();
                }
            };
            if (arr.length) {
                importScript();
            }
        },
        html: function(html, link) {
            var fragment = global.document.createRange().createContextualFragment(html);
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
            var scriptsFragment = global.document.createDocumentFragment();
            // FIXME: this loses the original position of the script
            // should add a placeholder so we can reinsert the clone
            var scripts = fragment.querySelectorAll('script');
            [].forEach.call(scripts, function(script) {
                var placeholder = global.document.createComment(script.src || 'inline script');
                script.parentNode.insertBefore(placeholder, script);
                script.dataset.simplyLocation = scriptLocations.length;
                scriptLocations.push(placeholder);
                scriptsFragment.appendChild(script);
            });
            // add the remainder before the include link
            link.parentNode.insertBefore(fragment, link ? link : null);
            global.setTimeout(function() {
                if (global.editor && global.editor.data && fragment.querySelector('[data-simply-field],[data-simply-list]')) {
                    //TODO: remove this dependency and let simply.bind listen for dom node insertions (and simply-edit.js use simply.bind)
                    global.editor.data.apply(global.editor.currentData, global.document);
                }
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
            var links = global.document.querySelectorAll('link[rel="simply-include"],link[rel="simply-include-once"]');
            if (links.length) {
                includeLinks(links);
            }
        });
    });

    var observe = function() {
        observer = new MutationObserver(handleChanges);
        observer.observe(global.document, {
            subtree: true,
            childList: true,
        });
    };

    observe();
    handleChanges(); // check if there are include links in the dom already

    if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
        module.exports = include;
    } else {
        if (!global.simply) {
            global.simply = {};
        }
        global.simply.include = include;
    }


})(this);
