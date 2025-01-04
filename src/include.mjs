function throttle( callbackFunction, intervalTime ) {
    let eventId = 0
    return () => {
        const myArguments = arguments
        if ( eventId ) {
            return
        } else {
            eventId = globalThis.setTimeout( () => {
                callbackFunction.apply(this, myArguments)
                eventId = 0
            }, intervalTime )
        }
    }
}

const runWhenIdle = (() => {
    if (globalThis.requestIdleCallback) {
        return (callback) => {
            globalThis.requestIdleCallback(callback, {timeout: 500})
        }
    }
    return globalThis.requestAnimationFrame
})()

function rebaseHref(relative, base) {
    let url = new URL(relative, base)
    if (include.cacheBuster) {
        url.searchParams.set('cb',include.cacheBuster)
    }
    return url.href
}

let observer, loaded = {}
let head = globalThis.document.querySelector('head')
let currentScript = globalThis.document.currentScript
let getScriptURL, currentScriptURL
if (!currentScript) {
    getScriptURL = (() => {
        var scripts = document.getElementsByTagName('script')
        var index = scripts.length - 1
        var myScript = scripts[index]
        return () => myScript.src
    })()
    currentScriptURL = getScriptURL()
} else {
    currentScriptURL = currentScript.src
}

const waitForPreviousScripts = async () => {
    // because of the async=false attribute, this script will run after
    // the previous scripts have been loaded and run
    // simply.include.next.js only fires the simply-next-script event
    // that triggers the Promise.resolve method
    return new Promise(function(resolve) {
        var next = globalThis.document.createElement('script')
        next.src = "javascript:document.dispatchEvent(new Event('simply-include-next'))"
        next.async = false
        globalThis.document.addEventListener('simply-include-next', () => {
            head.removeChild(next)
            resolve()
        }, { once: true, passive: true})
        head.appendChild(next)
    })
}

let scriptLocations = []

export const include = {
    cacheBuster: null,
    scripts: (scripts, base) => {
        let arr = scripts.slice()
        const importScript = () => {
            const script = arr.shift()
            if (!script) {
                return
            }
            const attrs  = [].map.call(script.attributes, (attr) => {
                return attr.name
            })
            let clone  = globalThis.document.createElement('script')
            for (const attr of attrs) {
                clone.setAttribute(attr, script.getAttribute(attr))
            }
            clone.removeAttribute('data-simply-location')
            if (!clone.src) {
                // this is an inline script, so copy the content and wait for previous scripts to run
                clone.innerHTML = script.innerHTML
                waitForPreviousScripts()
                    .then(() => {
                        const node = scriptLocations[script.dataset.simplyLocation]
                        node.parentNode.insertBefore(clone, node)
                        node.parentNode.removeChild(node)
                        importScript()
                    })
            } else {
                clone.src = rebaseHref(clone.src, base)
                if (!clone.hasAttribute('async') && !clone.hasAttribute('defer')) {
                    clone.async = false //important! do not use clone.setAttribute('async', false) - it has no effect
                }
                const node = scriptLocations[script.dataset.simplyLocation]
                node.parentNode.insertBefore(clone, node)
                node.parentNode.removeChild(node)
                loaded[clone.src]=true
                importScript()
            }
        }
        if (arr.length) {
            importScript()
        }
    },
    html: (html, link) => {
        let fragment = globalThis.document.createRange().createContextualFragment(html)
        const stylesheets = fragment.querySelectorAll('link[rel="stylesheet"],style')
        // add all stylesheets to head
        for (let stylesheet of stylesheets) {
            if (stylesheet.href) {
                stylesheet.href = rebaseHref(stylesheet.href, link.href)
            }
            head.appendChild(stylesheet)
        }
        // remove the scripts from the fragment, as they will not run in the
        // order in which they are defined
        let scriptsFragment = globalThis.document.createDocumentFragment()
        const scripts = fragment.querySelectorAll('script')
        for (let script of scripts) {
            let placeholder = globalThis.document.createComment(script.src || 'inline script')
            script.parentNode.insertBefore(placeholder, script)
            script.dataset.simplyLocation = scriptLocations.length
            scriptLocations.push(placeholder)
            scriptsFragment.appendChild(script)
        }
        // add the remainder before the include link
        link.parentNode.insertBefore(fragment, link ? link : null)
        globalThis.setTimeout(function() {
            include.scripts(scriptsFragment.childNodes, link ? link.href : globalThis.location.href )
        }, 10)
    }
}

let included = {}
const includeLinks = async (links) => {
    // mark them as in progress, so handleChanges doesn't find them again
    let remainingLinks = [].reduce.call(links, (remainder, link) => {
        if (link.rel=='simply-include-once' && included[link.href]) {
            link.parentNode.removeChild(link)
        } else {
            included[link.href]=true
            link.rel = 'simply-include-loading'
            remainder.push(link)
        }
        return remainder
    }, [])

    for (let link of remainingLinks) {
        if (!link.href) {
            return
        }
        // fetch the html
        const response = await fetch(link.href)
        if (!response.ok) {
            console.log('simply-include: failed to load '+link.href);
            continue
        }
        console.log('simply-include: loaded '+link.href);
        const html = await response.text()
        // if succesfull import the html
        include.html(html, link)
        // remove the include link
        link.parentNode.removeChild(link)
    }
}

const handleChanges = throttle(() => {
    runWhenIdle(() => {
        var links = globalThis.document.querySelectorAll('link[rel="simply-include"],link[rel="simply-include-once"]')
        if (links.length) {
            includeLinks(links)
        }
    })
})

const observe = () => {
    observer = new MutationObserver(handleChanges)
    observer.observe(globalThis.document, {
        subtree: true,
        childList: true,
    })
}

observe()
handleChanges() // check if there are include links in the dom already
