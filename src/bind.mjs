import { throttledEffect } from './signals.mjs'

export function bind(options)
{
    const defaultOptions = {
        container: document.body,
        attribute: 'data-bind',
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
                return defaultTransformer.call(el, {template, path, value}, applyTemplate)
            }
            return options.transformers[el.dataset.transform].call(el, {template, path, value}, applyTemplate)
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

export function defaultTransformer(options, applyTemplate) {
    const template = options.template
    const path = options.path
    const value = options.value
    // TODO: support multiple templates and a way to select the correct one per entry
    if (Array.isArray(value) && template) {
        let items = this.querySelectorAll(':scope > [data-bind-key]')
        // do single merge strategy for now, in future calculate optimal merge strategy from a number
        // now just do a delete if a key <= last key, insert if a key >= last key
        let lastKey = 0
        for (let item of items) {
            if (item.dataset.bindKey>lastKey) {
                // insert before
                this.insertBefore(applyTemplate(path, template, value, lastKey), item)
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
                    return (b.dataset.bind.substr(0,5)!=='#root' 
                        && b.dataset.bind.substr(0, path.length)!==path)
                })
                if (needsReplacement) {
                    this.replaceChild(applyTemplate(path, template, value, lastKey), item)
                }
            }
            lastKey++
            if (lastKey>=value.length) {
                break
            }
        }
        items = this.querySelectorAll(':scope > [data-bind-key]')
        let length = items.length
        if (length > value.length) {
            while (length > value.length) {
                let child = this.querySelector(':scope > :nth-child('+(length+1)+')') //FIXME: assumes 1 template element
                child?.remove()
                length--
            }
        } else if (length < value.length ) {
            while (length < value.length) {
                this.appendChild(applyTemplate(path, template, value, length))
                length++
            }
        }
    } else if (value && typeof value == 'object' && template) {
        let list    = Object.entries(value)
        let items   = this.querySelectorAll(':scope > [data-bind-key]')
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
                this.replaceChild(applyTemplate(path, template, value, key), item)
            }
        }
        items  = this.querySelectorAll(':scope > [data-bind-key]')
        let length = items.length
        if (length>list.length) {
            while (length>list.length) {
                let child = this.querySelector(':scope > :nth-child('+(length+1)+')') //FIXME: assumes 1 template element
                child?.remove()
                length--
            }
        } else if (length < list.length) {
            while (length < list.length) {
                let key = list[length][0]
                this.appendChild(applyTemplate(path, template, value, key))
                length++
            }
        }
    } else if (this.tagName=='INPUT') {
        if (this.type=='checkbox' || this.type=='radio') {
            if (this.value == ''+value) {
                this.checked = true
            } else {
                this.checked = false
            }
        } else if (this.value != ''+value) {
            this.value = ''+value
        }
    } else if (this.tagName=='BUTTON') {
        if (this.value!=''+value) {
            this.value = ''+value
        }
    } else if (this.tagName=='SELECT') {
        if (this.multiple) {
            if (Array.isArray(value)) {
                for (let option of this.options) {
                    if (value.indexOf(option.value)===false) {
                        option.selected = false
                    } else {
                        option.selected = true
                    }
                }
            }
        } else {
            let option = this.options.find(o => o.value==value)
            if (option) {
                option.selected = true
            }
        }
    } else if (this.tagName=='A') {
        if (value?.innerHTML && this.innerHTML!=''+value.innerHTML) {
            this.innerHTML = ''+value.innerHTML
        }
        if (value?.href && this.href != ''+value.href) {
            this.href = ''+value.href
        }
    } else {
        if (this.innerHTML != ''+value) {
            this.innerHTML = ''+value
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
