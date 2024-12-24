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
            callback.call(node)
        }
    }
}

function handleChanges(changes) {
    let activateNodes = []
    for (let change of changes) {
        if (change.type == 'childList') {
            for (let node of change.addedNodes) {
                if (node.querySelectorAll) {
                    var toActivate = Array.from(node.querySelectorAll('[data-simply-activate]'))
                    if (node.matches('[data-simply-activate]')) {
                        toActivate.push(node)
                    }
                    activateNodes = activateNodes.concat(toActivate)
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