import { signal, effect, throttledEffect } from './signal.mjs'

export function bind(options)
{
    const defaultOptions = {
        container: document.body,
        attribute: 'data-simply-bind',
        transformers: []
    }
    if (!options?.root) {
        throw new Error('bind needs at least options.root set')
    }
    options = Object.assign({}, defaultOptions, options)

    const updateBindings = (changes) => {
        for (const change of changes) {
            if (change.type=="childList" && change.addedNodes) {
                for (let node of change.addedNodes) {
                    if (node instanceof HTMLElement) {
                        let bindings = Array.from(node.querySelectorAll(`[${options.attribute}]`))
                        if (node.matches(`[${options.attribute}]`)) {
                            bindings.unshift(node)
                        }
                        if (bindings.length) {
                            applyBindings(bindings)
                        }
                    }
                }
            }
        }
    }

    const handleChanges = (changes) => {
        updateBindings(changes)
    }

    var observer = new MutationObserver((changes) => {
        handleChanges(changes)
    })
    observer.observe(options.container, {
        subtree: true,
        childList: true
    })

    const applyBindings = (bindings) => {
        for (let bindingEl of bindings) {
            render(bindingEl, options.root)
        }
    }

    const applyTemplate = (path, template, list, index) => {
        let clone = template.content.cloneNode(true)
        if (clone.children.length>1) {
            throw new Error('template must contain a single root node', { cause: template })
        }
        const bindings = clone.querySelectorAll('['+options.attribute+']')
        for (let binding of bindings) {
            const bind = binding.dataset.bind
            if (bind.substring(0, '#root.'.length)=='#root.') {
                binding.dataset.bind = bind.substring('#root.'.length)
            } else if (bind=='#value') {
                binding.dataset.bind = path+'.'+index
            } else {
                binding.dataset.bind = path+'.'+index+'.'+binding.dataset.bind
            }
        }
        clone.children[0].setAttribute(options.attribute+'-key',index)
        return clone
    }

    const render = (el, root) => {
        throttledEffect(() => {
            const template = el.querySelector('template')
            const path = getBindingPath(el)
            const value = getValueByPath(root, path) || ''
            if (!el.dataset.transform || !options.transformers[el.dataset.transform]) {
                return defaultTransformer.apply(el, {template, path, value})
            }
            return options.transformers[el.dataset.transform].apply(el, {template, path, value})
        }, 100)
    }
    
    const getBindingPath = (el) => {
        return el.getAttribute(options.attribute)
    }

    var bindings = options.container.querySelectorAll('[data-bind]')
    if (bindings.length) {
        applyBindings(bindings)
    }
}

export function defaultTransformer(options) {
    const {template, path, value} = options
    // TODO: support multiple templates and a way to select the correct one per entry
    if (Array.isArray(value) && template) {
        let items = el.querySelectorAll(':scope > [data-bind-key]')
        // do single merge strategy for now, in future calculate optimal merge strategy from a number
        // now just do a delete if a key <= last key, insert if a key >= last key
        let lastKey = 0
        for (let item of items) {
            if (item.dataset.bindKey>lastKey) {
                // insert before
                el.insertBefore(applyTemplate(path, template, value, lastKey), item)
            } else if (item.dataset.bindKey<lastKey) {
                // remove this
                item.remove()
            } else {
                // check that all data-bind params start with current json path or a '#', otherwise replaceChild
                let bindings = Array.from(item.querySelectorAll('[data-bind]'))
                if (item.matches('[data-bind]')) {
                    bindings.unshift(item)
                }
                let needsReplacement = bindings.find(b => {
                    return (b.dataset.bind.substr(0,5)!=='#root' && b.dataset.bind.substr(0, path.length)!==path)
                })
                if (needsReplacement) {
                    el.replaceChild(applyTemplate(path, template, value, lastKey), item)
                }
            }
            lastKey++
            if (lastKey>=value.length) {
                break
            }
        }
        items = el.querySelectorAll(':scope > [data-bind-key]')
        let length = items.length
        if (length > value.length) {
            while (length > value.length) {
                let child = el.querySelector(':scope > :nth-child('+(length+1)+')') //FIXME: assumes 1 template element
                child?.remove()
                length--
            }
        } else if (length < value.length ) {
            while (length < value.length) {
                el.appendChild(applyTemplate(path, template, value, length))
                length++
            }
        }
    } else if (value && typeof value == 'object' && template) {
        let list    = Object.entries(value)
        let items   = el.querySelectorAll(':scope > [data-bind-key]')
        let current = 0
        for (let item of items) {
            if (current>=list.length) {
                break
            }
            let key = list[current][0]
            current++
            let keypath = path+'.'+key
            // check that all data-bind params start with current json path or a '#', otherwise replaceChild
            let needsReplacement
            if (item.dataset?.bind && item.dataset.bind.substr(0, keypath.length)!=keypath) {
                needsReplacement=true
            } else {
                let bindings = Array.from(item.querySelectorAll('[data-bind]'))
                needsReplacement = bindings.find(b => {
                    return (b.dataset.bind.substr(0,5)!=='#root' && b.dataset.bind.substr(0, keypath.length)!==keypath)
                })
            }
            if (needsReplacement) {
                el.replaceChild(applyTemplate(path, template, value, key), item)
            }
        }
        items  = el.querySelectorAll(':scope > [data-bind-key]')
        let length = items.length
        if (length>list.length) {
            while (length>list.length) {
                let child = el.querySelector(':scope > :nth-child('+(length+1)+')') //FIXME: assumes 1 template element
                child?.remove()
                length--
            }
        } else if (length < list.length) {
            while (length < list.length) {
                let key = list[length][0]
                el.appendChild(applyTemplate(path, template, value, key))
                length++
            }
        }
    } else if (el.tagName=='INPUT') {
        if (el.type=='checkbox' || el.type=='radio') {
            if (el.value == ''+value) {
                el.checked = true
            } else {
                el.checked = false
            }
        } else if (el.value != ''+value) {
            el.value = ''+value
        }
    } else if (el.tagName=='BUTTON') {
        if (el.value!=''+value) {
            el.value = ''+value
        }
    } else if (el.tagName=='SELECT') {
        if (el.multiple) {
            if (Array.isArray(value)) {
                for (let option of el.options) {
                    if (value.indexOf(option.value)===false) {
                        option.selected = false
                    } else {
                        option.selected = true
                    }
                }
            }
        } else {
            let option = el.options.find(o => o.value==value)
            if (option) {
                option.selected = true
            }
        }
    } else if (el.tagName=='A') {
        if (value?.innerHTML && el.innerHTML!=''+value.innerHTML) {
            el.innerHTML = ''+value.innerHTML
        }
        if (value?.href && el.href != ''+value.href) {
            el.href = ''+value.href
        }
    } else {
        if (el.innerHTML != ''+value) {
            el.innerHTML = ''+value
        }
    }
}

function getValueByPath(root, path)
{
    let parts = path.split('.');
    let curr = root;
    let part, prevPart;
    while (parts.length && curr) {
        part = parts.shift()
        part = decodeURIComponent(part)
        if (part=='#key') {
            return prevPart
        } else if (part=='#value') {
            return curr
        } else if (part=='#root') {
            curr = root
        } else {
            curr = curr[part];
            prevPart = part
        }
    }
    return curr
}
