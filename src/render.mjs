export class SimplyRender extends HTMLElement 
{
    constructor()
    {
        super()
    }

    connectedCallback()
    {
        let templateId = this.getAttribute("rel")
        let template = document.getElementById(templateId)

        if (template) {
            let content = template.content.cloneNode(true)
            for (const node of content.childNodes) {
                const clone = node.cloneNode(true)
                if (clone.nodeType == document.ELEMENT_NODE) {
                    clone.querySelectorAll("template").forEach(function(t) {
                        t.setAttribute("simply-render", "")
                    })
                }
                this.parentNode.insertBefore(clone, this)
            }
            this.parentNode.removeChild(this)
        }
    }
}

if (!customElements.get('simply-render')) {
    customElements.define('simply-render', SimplyRender);
}

const handleChanges = () => {
    const simplyrenders = globalThis.document.querySelectorAll('simply-render[rel]')
    for (el of simplyrenders) {
        if (document.querySelector('template#'+el.getAttribute('rel'))) {
            el.replaceWith(el) // trigger connectedCallback?
        }
    }
}

const observe = () => {
    observer = new MutationObserver(handleChanges)
    observer.observe(globalThis.document, {
        subtree: true,
        childList: true,
    })
}

observe()