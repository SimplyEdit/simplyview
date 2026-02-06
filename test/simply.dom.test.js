import { findAttribute } from '../src/dom.mjs'

// test('toCamelCase', () => {
// 	expect(toCamelCase('foo_bar_baz')).toBe('fooBarBaz')
// })

// test('to_snake_case', () => {
// 	expect(to_snake_case('fooBarBaz')).toBe('foo_bar_baz')
// })

test('findAttribute', () => {
    const source = `<div data-simply-foo="bar"><button data-simply-command="foo">foo<button></div>`
    document.body.innerHTML = source
    const el = document.body.querySelector('button')
    const foo = findAttribute(el, 'data-simply-foo')
    expect(foo).toBe('bar')
})