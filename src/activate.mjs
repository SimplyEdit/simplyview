if (!Symbol.onDestroy) {
    Symbol.onDestroy = Symbol('onDestroy')
}

const listeners = new Map()

export const activate = {
    addListener: (name, callback) => {
        if (!listeners.has(name)) {
            listeners.set(name, [])
        }
        listeners.get(name).push(callback)
        initialCall(name)
    },
    removeListener: (name, callback) => {
        if (!listeners.has(name)) {
            return false
        }
        listeners.set(name, listeners.get(name).filter((listener) => {
            return listener!=callback
        }))
    }
}

function initialCall(name) {
    const nodes = document.querySelectorAll('[data-simply-activate="'+name+'"]')
    if (nodes) {
        for( let node of nodes) {
            callListeners(node)
        }
    }
}

function callListeners(node) {
    const activate = node?.dataset?.simplyActivate
    if (activate && listeners.has(activate)) {
        for (let callback of listeners.get(activate)) {
            const onDestroy = callback.call(node)
            if (typeof onDestroy == 'function') {
                node[Symbol.onDestroy] = onDestroy
            } else if (typeof onDestroy != 'undefined') {
                console.warn('activate listener may only return a de-activate function, instead got', onDestroy)
            }
        }
    }
}

function handleChanges(changes) {
    let activateNodes = []
    for (let change of changes) {
        if (change.type == 'childList') {
            for (let node of change.addedNodes) {
                if (node.querySelectorAll) {
                    let toActivate = Array.from(node.querySelectorAll('[data-simply-activate]'))
                    if (node.matches('[data-simply-activate]')) {
                        toActivate.push(node)
                    }
                    activateNodes = activateNodes.concat(toActivate)
                }
            }
            for (let node of change.removedNodes) {
                if (node.querySelectorAll) {
                    let toDestroy = Array.from(node.querySelectorAll('[data-simply-activate]'))
                    if (node.matches['[data-simply-activate']) {
                        toDestroy.push(node)
                    }
                    for (let child of toDestroy) {
                        if (child[Symbol.onDestroy]) {
                            child[Symbol.onDestroy].call(child)
                        }
                    }
                }
            }
        }
    }
    for (let node of activateNodes) {
        callListeners(node)
    }
}

const observer = new MutationObserver(handleChanges)
observer.observe(document, {
    subtree: true,
    childList: true
})