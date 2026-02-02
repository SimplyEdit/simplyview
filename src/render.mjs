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
                        t.setAttribute("simply-render", "") //FIXME: whats this?
                    })
                    if (this.attributes) {
                        for (const attr of this.attributes) {
                            if (attr.name!='rel') {
                                clone.setAttribute(attr.name, attr.value)
                            }
                        }
                    }
                }
                this.parentNode.insertBefore(clone, this)
            }
            this.parentNode.removeChild(this)
        } else {
            const observe = () => {
                const observer = new MutationObserver(() => {
                    template = document.getElementById(templateId)
                    if (template) {
                        observer.disconnect()
                        this.replaceWith(this) // trigger connectedCallback?
                    }
                })
                observer.observe(globalThis.document, {
                    subtree: true,
                    childList: true,
                })
            }

            observe()
        }
    }
}

if (!customElements.get('simply-render')) {
    customElements.define('simply-render', SimplyRender);
}