import {app} from '../src/app.mjs'

const simplyApp = app({
    commands: {
        foo: function(el, value) { this.view.foo = 'bar' },
        bar: function(el, value) { this.commands.call('foo') },
        baz: function(el, value) { this.app.commands.call('foo') },
        baq: function(el, value) { this.actions.foo('baq') },
        bax: function(el, value) { this.commands.action('foo','bax') },
        bam: function(ek, value) { this.action('foo','bam') }
    },
    actions: {
        foo: async function(param) {
            this.view.foo = param
            return true
        }
    },
    view: {
        foo: null
    }
})

let warn = console.warn
function disableWarnings() {
    console.warn = () => {}
}
function enableWarnings() {
    console.warn = warn
}

describe('commands can', () => {
    it('be triggered by click', (done) => {
        const source = `<button data-simply-command="foo">foo<button>`
        document.body.innerHTML = source
        const el = document.body.querySelector('button')
        el.click()
        expect(simplyApp.view.foo).toBe('bar')
        done()
    })
    it('call other commands', (done) => {
        simplyApp.view.foo = null
        const source = `<button data-simply-command="bar">bar<button>`
        document.body.innerHTML = source
        const el = document.body.querySelector('button')
        el.click()
        expect(simplyApp.view.foo).toBe('bar')
        done()      
    })
    it('support old style commands using this.app', (done) => {
        simplyApp.view.foo = null
        const source = `<button data-simply-command="baz">baz<button>`
        document.body.innerHTML = source
        const el = document.body.querySelector('button')
        el.click()
        expect(simplyApp.view.foo).toBe('bar')
        done()            
    })
    it('can call actions', (done) => {
        simplyApp.view.foo = null
        const source = `<button data-simply-command="baq">baq<button>`
        document.body.innerHTML = source
        const el = document.body.querySelector('button')
        el.click()
        expect(simplyApp.view.foo).toBe('baq')
       done()
    })
    it('can call actions old style', (done) => {
        disableWarnings()
        simplyApp.view.foo = null
        const source = `<button data-simply-command="bax">bax<button>`
        document.body.innerHTML = source
        const el = document.body.querySelector('button')
        el.click()
        expect(simplyApp.view.foo).toBe('bax')
        enableWarnings()
        done()
    })
    it('can call actions older style', (done) => {
        disableWarnings()
        simplyApp.view.foo = null
        const source = `<button data-simply-command="bam">bam<button>`
        document.body.innerHTML = source
        const el = document.body.querySelector('button')
        el.click()
        expect(simplyApp.view.foo).toBe('bam')
        enableWarnings()
        done()
    })
})
