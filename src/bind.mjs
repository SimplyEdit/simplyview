import { throttledEffect } from './state.mjs'

class SimplyBind {
    constructor(options) {
        const defaultOptions = {
            container: document.body,
            attribute: 'data-bind',
            transformers: [],
            defaultTransformers: [defaultTransformer]
        }
        if (!options?.root) {
            throw new Error('bind needs at least options.root set')
        }
        this.options = Object.assign({}, defaultOptions, options)

        const attribute = this.options.attribute

        // sets up the effect that updates the element if its
        // data binding value changes
        const render = (el) => {
            throttledEffect(() => {
                const context = {
                    templates: el.querySelectorAll(':scope > template'),
                    path: this.getBindingPath(el)
                }
                context.value = getValueByPath(this.options.root, context.path)
                context.element = el
                runTransformers(context)
            }, 100)
        }

        // finds and runs applicable transformers
        // creates a stack of transformers, calls the topmost
        // each transformer can opt to call the next or not
        // transformers should return the context object (possibly altered)
        const runTransformers = (context) => {
            let transformers = this.options.defaultTransformers || []
            if (context.element.dataset.transform) {
                context.element.dataset.transform.split(' ').filter(Boolean).forEach(t => {
                    if (this.options.transformers[t]) {
                        transformers.push(this.options.transformers[t])
                    } else {
                        console.warn('No transformer with name '+t+' configured', {cause:context.element})
                    }
                })
            }
            let next
            for (let transformer of transformers) {
                next = ((next, transformer) => {
                    return (context) => {
                        return transformer.call(this, context, next)
                    }
                })(next, transformer)
            }
            next(context)
        }

        // given a set of elements with data bind attribute
        // this renders each of those elements
        const applyBindings = (bindings) => {
            for (let bindingEl of bindings) {
                render(bindingEl)
            }
        }

        // this handles the mutation observer changes
        // if any element is added, and has a data bind attribute
        // it applies that data binding
        const updateBindings = (changes) => {
            for (const change of changes) {
                if (change.type=="childList" && change.addedNodes) {
                    for (let node of change.addedNodes) {
                        if (node instanceof HTMLElement) {
                            let bindings = Array.from(node.querySelectorAll(`[${attribute}]`))
                            if (node.matches(`[${attribute}]`)) {
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

        // this responds to elements getting added to the dom
        // and if any have data bind attributes, it applies those bindings
        const observer = new MutationObserver((changes) => {
            updateBindings(changes)
        })

        observer.observe(options.container, {
            subtree: true,
            childList: true
        })

        // this finds elements with data binding attributes and applies those bindings
        // must come after setting up the observer, or included templates
        // won't trigger their own bindings
        const bindings = this.options.container.querySelectorAll('['+this.options.attribute+']:not(template)')
        if (bindings.length) {
            applyBindings(bindings)
        }

    }

    /**
     * Finds the first matching template and creates a new DocumentFragment
     * with the correct data bind attributes in it (prepends the current path)
     */
    applyTemplate(path, templates, list, index) {
        let template = this.findTemplate(templates, list[index])
        if (!template) {
            let result = new DocumentFragment()
            result.innerHTML = '<!-- no matching template -->'
            return result
        }
        let clone = template.content.cloneNode(true)
        if (!clone.children?.length) {
            throw new Error('template must contain a single html element', { cause: template })
        }
        if (clone.children.length>1) {
            throw new Error('template must contain a single root node', { cause: template })
        }
        const bindings = clone.querySelectorAll('['+this.options.attribute+']')
        const attribute = this.options.attribute
        for (let binding of bindings) {
            const bind = binding.getAttribute(attribute)
            if (bind.substring(0, '#root.'.length)=='#root.') {
                binding.setAttribute(attribute, bind.substring('#root.'.length))
            } else if (bind=='#value') {
                binding.setAttribute(attribute, path+'.'+index)
            } else {
                binding.setAttribute(attribute, path+'.'+index+'.'+bind)
            }
        }
        clone.children[0].setAttribute(attribute+'-key',index)
        // keep track of the used template, so if that changes, the 
        // item can be updated
        clone.children[0].$bindTemplate = template
        return clone
    }

    getBindingPath(el) {
        return el.getAttribute(this.options.attribute)
    }

    /**
     * Finds the first template from an array of templates that
     * matches the given value. 
     */
    findTemplate(templates, value) {
        const templateMatches = t => {
            let path = this.getBindingPath(t)
            if (!path) {
                return t
            }
            let currentItem
            if (path.substr(0,6)=='#root.') {
                currentItem = getValueByPath(this.options.root, path)
            } else {
                currentItem = getValueByPath(value, path)
            }
            const strItem = ''+currentItem
            let matches = t.getAttribute(this.options.attribute+'-matches')
            if (matches) {
                if (matches==='#empty' && !currentItem) {
                    return t
                } else if (matches==='#notempty' && currentItem) {
                    return t
                }
                if (strItem.match(matches)) {
                    return t
                }
            }
            if (!matches) {
                if (currentItem) {
                    return t
                }
            }
        };
        let template = Array.from(templates).find(templateMatches)
        let rel = template?.getAttribute('rel')
        if (rel) {
            let replacement = document.querySelector('template#'+rel)
            if (!replacement) {
                throw new Error('Could not find template with id '+rel)
            }
            template = replacement
        }
        return template
    }

}

/**
 * Returns a new instance of SimplyBind. This is the normal start
 * of a data bind flow
 */
export function bind(options)
{
    return new SimplyBind(options)
}

/**
 * Returns true if a matches b, either by having the
 * same string value, or matching string #empty against a falsy value
 */
export function matchValue(a,b) {
    if (a=='#empty' && !b) {
        return true
    }
    if (b=='#empty' && !a) {
        return true
    }
    if (''+a == ''+b) {
        return true
    }
    return false
}

/**
 * Returns the value by walking the given path
 * as a json pointer, starting at root
 * if you have a property with a '.' in its name
 * urlencode the '.', e.g: %46
 */
export function getValueByPath(root, path)
{
    let parts = path.split('.');
    let curr = root;
    let part, prevPart;
    while (parts.length && curr) {
        part = parts.shift()
        if (part=='#key') {
            return prevPart
        } else if (part=='#value') {
            return curr
        } else if (part=='#root') {
            curr = root
        } else {
            part = decodeURIComponent(part)
            curr = curr[part];
            prevPart = part
        }
    }
    return curr
}

/**
 * Default transformer for data binding
 * Will be used unless overriden in the SimplyBind options parameter
 */
export function defaultTransformer(context) {
    const el = context.element
    const templates = context.templates
    const templatesCount = templates.length 
    const path = context.path
    const value = context.value
    const attribute = this.options.attribute
    if (Array.isArray(value) && templates?.length) {
        transformArrayByTemplates.call(this, context)
    } else if (value && typeof value == 'object' && templates?.length) {
        transformObjectByTemplates.call(this, context)
    } else if (el.tagName=='INPUT') {
        transformInput.call(this, context)
    } else if (el.tagName=='BUTTON') {
        transformButton.call(this, context)
    } else if (el.tagName=='SELECT') {
        transformSelect.call(this, context)
    } else if (el.tagName=='A') {
        transformAnchor.call(this, context)
    } else {
        transformElement.call(this, context)
    }
    return context
}

/**
 * Renders an array value by applying templates for each entry
 * Replaces or removes existing DOM children if needed
 * Reuses (doesn't touch) DOM children if template doesn't change
 */
export function transformArrayByTemplates(context) {
    const el             = context.element
    const templates      = context.templates
    const templatesCount = templates.length 
    const path           = context.path
    const value          = context.value
    const attribute      = this.options.attribute

    let items = el.querySelectorAll(':scope > ['+attribute+'-key]')
    // do single merge strategy for now, in future calculate optimal merge strategy from a number
    // now just do a delete if a key <= last key, insert if a key >= last key
    let lastKey = 0
    let skipped = 0
    for (let item of items) {
        let currentKey = parseInt(item.getAttribute(attribute+'-key'))
        if (currentKey>lastKey) {
            // insert before
            el.insertBefore(this.applyTemplate(path, templates, value, lastKey), item)
        } else if (currentKey<lastKey) {
            // remove this
            item.remove()
        } else {
            // check that all data-bind params start with current json path or a '#', otherwise replaceChild
            let bindings = Array.from(item.querySelectorAll(`[${attribute}]`))
            if (item.matches(`[${attribute}]`)) {
                bindings.unshift(item)
            }
            let needsReplacement = bindings.find(b => {
                let databind = b.getAttribute(attribute)
                return (databind.substr(0,5)!=='#root' 
                    && databind.substr(0, path.length)!==path)
            })
            if (!needsReplacement) {
                if (item.$bindTemplate) {
                    let newTemplate = this.findTemplate(templates, value[lastKey])
                    if (newTemplate != item.$bindTemplate){
                        needsReplacement = true
                        if (!newTemplate) {
                            skipped++
                        }
                    }
                }
            }
            if (needsReplacement) {
                el.replaceChild(this.applyTemplate(path, templates, value, lastKey), item)
            }
        }
        lastKey++
        if (lastKey>=value.length) {
            break
        }
    }
    items = el.querySelectorAll(':scope > ['+attribute+'-key]')
    let length = items.length + skipped
    if (length > value.length) {
        while (length > value.length) {
            let child = el.querySelectorAll(':scope > :not(template)')?.[length-1]
            child?.remove()
            length--
        }
    } else if (length < value.length ) {
        while (length < value.length) {
            el.appendChild(this.applyTemplate(path, templates, value, length))
            length++
        }
    }
}

/**
 * Renders an object value by applying templates for each entry (Object.entries)
 * Replaces or removes existing DOM children if needed
 * Reuses (doesn't touch) DOM children if template doesn't change
 */
export function transformObjectByTemplates(context) {
    const el             = context.element
    const templates      = context.templates
    const templatesCount = templates.length 
    const path           = context.path
    const value          = context.value
    const attribute      = this.options.attribute
    
    let list    = Object.entries(value)
    let items   = el.querySelectorAll(':scope > ['+attribute+'-key]')
    let current = 0
    let skipped = 0
    for (let item of items) {
        if (current>=list.length) {
            break
        }
        let key = list[current][0]
        current++
        let keypath = path+'.'+key
        // check that all data-bind params start with current json path or a '#', otherwise replaceChild
        let needsReplacement
        const databind = item.getAttribute(attribute)
        if (databind && databind.substr(0, keypath.length)!=keypath) {
            needsReplacement=true
        } else {
            let bindings = Array.from(item.querySelectorAll(`[${attribute}]`))
            needsReplacement = bindings.find(b => {
                const db = b.getAttribute(attribute)
                return (db.substr(0,5)!=='#root' && db.substr(0, keypath.length)!==keypath)
            })
            if (!needsReplacement) {
                if (item.$bindTemplate) {
                    let newTemplate = this.findTemplate(templates, value[key])
                    if (newTemplate != item.$bindTemplate){
                        needsReplacement = true
                        if (!newTemplate) {
                            skipped++
                        }
                    }
                }
            }
        }
        if (needsReplacement) {
            let clone = this.applyTemplate(path, templates, value, key)
            el.replaceChild(clone, item)
        }
    }
    items  = el.querySelectorAll(':scope > ['+attribute+'-key]')
    let length = items.length + skipped
    if (length>list.length) {
        while (length>list.length) {
            let child = el.querySelectorAll(':scope > :not(template)')?.[length-1]
            child?.remove()
            length--
        }
    } else if (length < list.length) {
        while (length < list.length) {
            let key = list[length][0]
            el.appendChild(this.applyTemplate(path, templates, value, key))
            length++
        }
    } 
}

/**
 * transforms a single input type
 * for radio/checkbox inputs it only sets the checked attribute to true/false
 * if the value attribute matches the current value
 * for other inputs the value attribute is updated
 * FIXME: handle radio/checkboxes in separate transformer
 */
export function transformInput(context) {
    const el    = context.element
    const value = context.value

    if (el.type=='checkbox' || el.type=='radio') {
        if (matchValue(el.value, value)) {
            el.checked = true
        } else {
            el.checked = false
        }
    } else if (!matchValue(el.value, value)) {
        el.value = ''+value
    }
}

/**
 * Sets the value of the button, doesn't touch the innerHTML
 */
export function transformButton(context) {
    const el    = context.element
    const value = context.value

    if (!matchValue(el.value,value)) {
        el.value = ''+value
    }
}

/**
 * Sets the selected attribute of select options
 */
export function transformSelect(context) {
    const el    = context.element
    const value = context.value

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
        let option = el.options.find(o => matchValue(o.value,value))
        if (option) {
            option.selected = true
        }
    }
}

/**
 * Sets the innerHTML and href attribute of an anchor
 * TODO: support target, title, etc. attributes
 */
export function transformAnchor(context) {
    const el    = context.element
    const value = context.value

    if (value?.innerHTML && !matchValue(el.innerHTML, value.innerHTML)) {
        el.innerHTML = ''+value.innerHTML
    }
    if (value?.href && !matchValue(el.href,value.href)) {
        el.href = ''+value.href
    }    
}

/**
 * sets the innerHTML of any HTML element
 */
export function transformElement(context) {
    const el    = context.element
    const value = context.value

    if (!matchValue(el.innerHTML, value)) {
        el.innerHTML = ''+value
    }
}