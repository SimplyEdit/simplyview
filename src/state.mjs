const source = Symbol('source')
const iterate = Symbol('iterate')

const signalHandler = {
    get: (target, property, receiver) => {
        if (property===source) {
            return target // don't notifyGet here, this is only called by set
        }
        const value = target?.[property] // Reflect.get fails on a Set.
        notifyGet(receiver, property)
        if (typeof value === 'function') {
            if (Array.isArray(target)) {
                return (...args) => {
                    let l = target.length
                    // by binding the function to the receiver
                    // all accesses in the function will be trapped
                    // by the Proxy, so get/set/delete is all handled
                    let result = value.apply(receiver, args)
                    if (l != target.length) {
                        notifySet(receiver,  makeContext('length', { was: l, now: target.length }) )
                    }
                    return result
                }
            } else if (target instanceof Set || target instanceof Map) {
                return (...args) => {
                    // node doesn't allow you to call set/map functions
                    // bound to the receiver.. so using target instead
                    // there are no properties to update anyway, except for size
                    let s = target.size
                    let result = value.apply(target, args)
                    if (s != target.size) {
                        notifySet(receiver, makeContext( 'size', { was: s, now: target.size }) )
                    }
                    // there is no efficient way to see if the function called
                    // has actually changed the Set/Map, but by assuming the
                    // 'setter' functions will change the results of the
                    // 'getter' functions, effects should update correctly
                    if (['set','add','clear','delete'].includes(property)) {
                        notifySet(receiver, makeContext( { entries: {}, forEach: {}, has: {}, keys: {}, values: {}, [Symbol.iterator]: {} } ) )
                    }
                    return result
                }
            } else {
                // support custom classes, hopefully
                return value.bind(receiver)
            }
        }
        if (value && typeof value == 'object') {
            //NOTE: get now returns a signal, set doesn't 'unsignal' the value set
            return signal(value)
        }
        return value
    },
    set: (target, property, value, receiver) => {
        value = value?.[source] || value // unwraps signal
        let current = target[property]
        if (current!==value) {
            target[property] = value
            notifySet(receiver, makeContext(property, { was: current, now: value } ) )
        }
        if (typeof current === 'undefined') {
            notifySet(receiver, makeContext(iterate, {}))
        }
        return true
    },
    has: (target, property) => { // receiver is not part of the has() call
        let receiver = signals.get(target) // so retrieve it here
        if (receiver) {
            notifyGet(receiver, property)
        }
        return Object.hasOwn(target, property)
    },
    deleteProperty: (target, property) => {
        if (typeof target[property] !== 'undefined') {
            let current = target[property]
            delete target[property]
            let receiver = signals.get(target) // receiver is not part of the trap arguments, so retrieve it here
            notifySet(receiver, makeContext(property,{ delete: true, was: current }))
        }
        return true
    },
    defineProperty: (target, property, descriptor) => {
        if (typeof target[property] === 'undefined') {
            let receiver = signals.get(target) // receiver is not part of the trap arguments, so retrieve it here
            notifySet(receiver, makeContext(iterate, {}))
        }
        return Object.defineProperty(target, property, descriptor)
    },
    ownKeys: (target) => {
        let receiver = signals.get(target) // receiver is not part of the trap arguments, so retrieve it here
        notifyGet(receiver, iterate)
        return Reflect.ownKeys(target)
    }

}

/**
 * Keeps track of the return signal for an update function, as well
 * as signals connected to other objects. 
 * Makes sure that a given object or function always uses the same
 * signal
 */
const signals = new WeakMap()

/**
 * Creates a new signal proxy of the given object, that intercepts get/has and set/delete
 * to allow reactive functions to be triggered when signal values change.
 */
export function signal(v) {
    if (!signals.has(v)) {
        signals.set(v, new Proxy(v, signalHandler))
    }
    return signals.get(v)
}

let batchedListeners = new Set()
let batchMode = 0
/**
 * Called when a signal changes a property (set/delete)
 * Triggers any reactor function that depends on this signal
 * to re-compute its values
 */
function notifySet(self, context={}) {
    let listeners = []
    context.forEach((change, property) => {
        let propListeners = getListeners(self, property)
        if (propListeners?.length) {
            for (let listener of propListeners) {
                addContext(listener, makeContext(property,change))
            }
            listeners = listeners.concat(propListeners)
        }
    })
    listeners = new Set(listeners.filter(Boolean))
    if (listeners) {
        if (batchMode) {
            batchedListeners = batchedListeners.union(listeners)
        } else {
            const currentEffect = computeStack[computeStack.length-1]
            for (let listener of Array.from(listeners)) {
                if (listener!=currentEffect && listener?.needsUpdate) {
                    listener()
                }
                clearContext(listener)
            }
        }
    }
}

function makeContext(property, change) {
    let context = new Map()
    if (typeof property === 'object') {
        for (let prop in property) {
            context.set(prop, property[prop])
        }
    } else {
        context.set(property, change)
    }
    return context
}

function addContext(listener, context) {
    if (!listener.context) {
        listener.context = context
    } else {
        context.forEach((change,property)=> {
            listener.context.set(property, change) // TODO: merge change if needed
        })
    }
    listener.needsUpdate = true
}

function clearContext(listener) {
    delete listener.context
    delete listener.needsUpdate
}

/**
 * Called when a signal property is accessed. If this happens
 * inside a reactor function--computeStack is not empty--
 * then it adds the current reactor (top of this stack) to its
 * listeners. These are later called if this property changes
 */
function notifyGet(self, property) {
    let currentCompute = computeStack[computeStack.length-1]
    if (currentCompute) {
        // get was part of a react() function, so add it
        setListeners(self, property, currentCompute)
    }
}

/**
 * Keeps track of which update() functions are dependent on which
 * signal objects and which properties. Maps signals to update fns
 */
const listenersMap = new WeakMap()

/**
 * Keeps track of which signals and properties are linked to which
 * update functions. Maps update functions and properties to signals
 */
const computeMap = new WeakMap()

/**
 * Returns the update functions for a given signal and property
 */
function getListeners(self, property) {
    let listeners = listenersMap.get(self)
    return listeners ? Array.from(listeners.get(property) || []) : []
}

/**
 * Adds an update function (compute) to the list of listeners on
 * the given signal (self) and property
 */
function setListeners(self, property, compute) {
    if (!listenersMap.has(self)) {
        listenersMap.set(self, new Map())
    }
    let listeners = listenersMap.get(self)
    if (!listeners.has(property)) {
        listeners.set(property, new Set())
    }
    listeners.get(property).add(compute)

    if (!computeMap.has(compute)) {
        computeMap.set(compute, new Map())
    }
    let connectedSignals = computeMap.get(compute)
    if (!connectedSignals.has(property)) {
        connectedSignals.set(property, new Set)
    }
    connectedSignals.get(property).add(self)
}

/**
 * Removes alle listeners that trigger the given reactor function (compute)
 * This happens when a reactor is called, so that it can set new listeners
 * based on the current call (code path)
 */
function clearListeners(compute) {
    let connectedSignals = computeMap.get(compute)
    if (connectedSignals) {
        connectedSignals.forEach(property => {
            property.forEach(s => {
                let listeners = listenersMap.get(s)
                if (listeners.has(property)) {
                    listeners.get(property).delete(compute)
                }
            })
        })
    }
}

/**
 * The top most entry is the currently running update function, used
 * to automatically record signals used in an update function.
 */
let computeStack = []

/**
 * Used for cycle detection: effectStack contains all running effect
 * functions. If the same function appears twice in this stack, there
 * is a recursive update call, which would cause an infinite loop.
 */
const effectStack = []

const effectMap = new WeakMap()
/**
 * Used for cycle detection: signalStack contains all used signals. 
 * If the same signal appears more than once, there is a cyclical 
 * dependency between signals, which would cause an infinite loop.
 */
const signalStack = []

/**
 * Runs the given function at once, and then whenever a signal changes that
 * is used by the given function (or at least signals used in the previous run).
 */
export function effect(fn) {
    if (effectStack.findIndex(f => fn==f)!==-1) {
        throw new Error('Recursive update() call', {cause:fn})
    }
    effectStack.push(fn)

    let connectedSignal = signals.get(fn)
    if (!connectedSignal) {
        connectedSignal = signal({
            current: null
        })
        signals.set(fn, connectedSignal)
    }

    // this is the function that is called automatically
    // whenever a signal dependency changes
    const computeEffect = function computeEffect() {
        if (signalStack.findIndex(s => s==connectedSignal)!==-1) {
            throw new Error('Cyclical dependency in update() call', { cause: fn})
        }
        // remove all dependencies (signals) from previous runs 
        clearListeners(computeEffect)
        // record new dependencies on this run
        computeStack.push(computeEffect)
        // prevent recursion
        signalStack.push(connectedSignal)
        // call the actual update function
        let result
        try {
            result = fn(computeEffect, computeStack, signalStack)
        } finally {
            // stop recording dependencies
            computeStack.pop()
            // stop the recursion prevention
            signalStack.pop()
            if (result instanceof Promise) {
                result.then((result) => {
                    connectedSignal.current = result
                })
            } else {
                connectedSignal.current = result
            }
        }
    }
    computeEffect.fn = fn
    effectMap.set(connectedSignal, computeEffect)

    // run the computEffect immediately upon creation
    computeEffect()
    return connectedSignal
}


export function destroy(connectedSignal) {
    // find the computeEffect associated with this signal
    const computeEffect = effectMap.get(connectedSignal)?.deref()
    if (!computeEffect) {
        return
    }

    // remove all listeners for this effect
    clearListeners(computeEffect)

    // remove all references to connectedSignal
    let fn = computeEffect.fn
    signals.remove(fn)

    effectMap.delete(connectedSignal)

    // if no other references to connectedSignal exist, it will be garbage collected
}

/**
 * Inside a batch() call, any changes to signals do not trigger effects
 * immediately. Instead, immediately after finishing the batch() call,
 * these effects will be called. Effects that are triggered by multiple
 * signals are called only once.
 * @param Function fn batch() calls this function immediately
 * @result mixed the result of the fn() function call
 */
export function batch(fn) {
    batchMode++
    let result
    try {
        result = fn()
    } finally {
        if (result instanceof Promise) {
            result.then(() => {
                batchMode--
                if (!batchMode) {
                    runBatchedListeners()
                }
            })
        } else {
            batchMode--
            if (!batchMode) {
                runBatchedListeners()
            }
        }
    }
    return result
}

function runBatchedListeners() {
    let copyBatchedListeners = Array.from(batchedListeners)
    batchedListeners = new Set()
    const currentEffect = computeStack[computeStack.length-1]
    for (let listener of copyBatchedListeners) {
        if (listener!=currentEffect && listener?.needsUpdate) {
            listener()
        }
        clearContext(listener)
    }
}

/**
 * A throttledEffect is run immediately once. And then only once
 * per throttleTime (in ms).
 * @param Function fn the effect function to run whenever a signal changes
 * @param int throttleTime in ms
 * @returns signal with the result of the effect function fn
 */
export function throttledEffect(fn, throttleTime) {
    if (effectStack.findIndex(f => fn==f)!==-1) {
        throw new Error('Recursive update() call', {cause:fn})
    }
    effectStack.push(fn)

    let connectedSignal = signals.get(fn)
    if (!connectedSignal) {
        connectedSignal = signal({
            current: null
        })
        signals.set(fn, connectedSignal)
    }

    let throttled = false
    let hasChange = true
    // this is the function that is called automatically
    // whenever a signal dependency changes
    const computeEffect = function computeEffect() {
        if (signalStack.findIndex(s => s==connectedSignal)!==-1) {
            throw new Error('Cyclical dependency in update() call', { cause: fn})
        }
        if (throttled && throttled>Date.now()) {
            hasChange = true
            return
        }
        // remove all dependencies (signals) from previous runs 
        clearListeners(computeEffect)
        // record new dependencies on this run
        computeStack.push(computeEffect)
        // prevent recursion
        signalStack.push(connectedSignal)
        // call the actual update function
        let result
        try {
            result = fn(computeEffect, computeStack, signalStack)
        } finally {
            hasChange = false
            // stop recording dependencies
            computeStack.pop()
            // stop the recursion prevention
            signalStack.pop()
            if (result instanceof Promise) {
                result.then((result) => {
                    connectedSignal.current = result
                })
            } else {
                connectedSignal.current = result
            }
        }
        throttled = Date.now()+throttleTime
        globalThis.setTimeout(() => {
            if (hasChange) {
                computeEffect()
            }
        }, throttleTime)
    }
    // run the computEffect immediately upon creation
    computeEffect()
    return connectedSignal
}

// refactor: Class clock() with an effect() method
// keep track of effects per clock, and add clock property to the effect function
// on notifySet add clock.effects to clock.needsUpdate list
// on clock.tick() (or clock.time++) run only the clock.needsUpdate effects 
// (first create a copy and reset clock.needsUpdate, then run effects)
export function clockEffect(fn, clock) {
    let connectedSignal = signals.get(fn)
    if (!connectedSignal) {
        connectedSignal = signal({
            current: null
        })
        signals.set(fn, connectedSignal)
    }

    let lastTick = -1 // clock.time should start at 0 or larger
    let hasChanged = true // make sure the first run goes through
    // this is the function that is called automatically
    // whenever a signal dependency changes
    const computeEffect = function computeEffect() {
        if (lastTick < clock.time) {
            if (hasChanged) {
                // remove all dependencies (signals) from previous runs 
                clearListeners(computeEffect)
                // record new dependencies on this run
                computeStack.push(computeEffect)
                // make sure the clock.time signal is a dependency
                lastTick = clock.time
                // call the actual update function
                let result 
                try {
                    result = fn(computeEffect, computeStack)
                } finally {
                    // stop recording dependencies
                    computeStack.pop()
                    if (result instanceof Promise) {
                        result.then((result) => {
                            connectedSignal.current = result
                        })
                    } else {
                        connectedSignal.current = result
                    }
                    hasChanged = false
                }
            } else {
                lastTick = clock.time
            }
        } else {
            hasChanged = true
        }
    }
    // run the computEffect immediately upon creation
    computeEffect()
    return connectedSignal
}

export function untracked(fn) {
    const remember = computeStack.slice()
    computeStack = []
    try {
        return fn()
    } finally {
        computeStack = remember
    }
}