#!/bin/bash
rm dist/simply.everything.js
find ./js/ -type f \( -iname "*.js" ! -iname "simply.include.next.js" \) -exec cat {} \;  >> dist/simply.everything.js
cp ./js/simply.include.next.js dist/