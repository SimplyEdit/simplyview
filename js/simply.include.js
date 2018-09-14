window.simply = (function(simply) {

    var throttle = function( callbackFunction, intervalTime ) {
        var eventId = 0;
        return function() {
            var myArguments = arguments;
            var me = this;
            if ( eventId ) {
                return;
            } else {
                eventId = window.setTimeout( function() {
                    callbackFunction.apply(me, myArguments);
                    eventId = 0;
                }, intervalTime );
            }
        }
    };

    var runWhenIdle = (function() {
        if (window.requestIdleCallback) {
            return function(callback) {
                window.requestIdleCallback(callback, {timeout: 500});
            };
        }
        return window.requestAnimationFrame;
    })();

    var rebaseHref = function(relative, base) {
        if (/^[a-z-]*:?\//.test(relative)) {
            return relative; // absolute href, no need to rebase
        }

        var stack = base.split("/"),
            parts = relative.split("/");
        stack.pop(); // remove current file name (or empty string)
                     // (omit if "base" is the current folder without trailing slash)
        for (var i=0; i<parts.length; i++) {
            if (parts[i] == ".")
                continue;
            if (parts[i] == "..")
                stack.pop();
            else
                stack.push(parts[i]);
        }
        return stack.join("/");
    }

    var observer, loaded = {};
    var head = document.documentElement.querySelector('head')
	var currentScript = document.currentScript;

    var waitForPreviousScripts = function() {
        // because of the async=false attribute, this script will run after
        // the previous scripts have been loaded and run
        // simply.include.signal.js only fires the simply-next-script event
        // that triggers the Promise.resolve method
        return new Promise(function(resolve, reject) {
            var next = document.createElement('script');
			var cachebuster = Date.now();
            next.src = rebaseHref('simply.include.next.js?'+cachebuster, currentScript.src);
            next.setAttribute('async', false);
            document.addEventListener('simply-include-next', function() {
                head.removeChild(next);
                resolve();
            }, { once: true, passive: true});
            head.appendChild(next);
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
                var attrs  = script.getAttributeNames();
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
						window.setTimeout(importScript, 10);
					});
                } else {
                    clone.src = rebaseHref(clone.src, base);
                    // FIXME: remove loaded check? browser loads/runs same script multiple times...
                    // should we do that also?
                    if (!loaded[clone.src] || clone.dataset.simplyIncludeMultiple) {
                        if (!clone.hasAttribute('async') && !clone.hasAttribute('defer')) {
                            clone.setAttribute('async', false);
                        }
						var node = scriptLocations[script.dataset.simplyLocation];
						node.parentNode.insertBefore(clone, node);
						node.parentNode.removeChild(node);
                   	    loaded[clone.src]=true;
                    }
                    importScript();
                }
            }
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
                head.appendChild(sylesheet);
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
			window.setTimeout(function() {
	            simply.include.scripts(scriptsFragment.childNodes, link ? link.href : window.location.href );
			}, 10);
        }
    }

    var includeLinks = function(links) {
        // mark them as in progress, so handleChanges doesn't find them again
        [].forEach.call(links, function(link) {
            link.rel = 'simply-include-loading';
        });
        [].forEach.call(links, function(link) {
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
            var links = document.querySelectorAll('link[rel="simply-include"]');
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

})(window.simply || {});
