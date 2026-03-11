export function findAttribute(el, attr) {
    return el.closest('['+attr+']')
        ?.getAttribute(attr)
}

// export function toCamelCase(str) {
//     return str.replace(
//         /([-_][a-z])/g, 
//         group => group
//             .toUpperCase()
//             .replace('-', '')
//             .replace('_', '')
//         )
// }

// export function to_snake_case(str) {
//     return str.replace(
//         /([a-z])([A-Z])/g, 
//         '$1_$2'
//     ).toLowerCase()
// }