#!/bin/bash
rm dist/simply.everything.js
cat js/simply.observe.js \
    js/simply.bind.js \
    js/simply.render.js \
    js/simply.path.js \
    js/simply.route.js \
    js/simply.activate.js \
    js/simply.collect.js \
    js/simply.command.js \
    js/simply.action.js \
    js/simply.resize.js \
    js/simply.include.js \
    js/simply.view.js \
    js/simply.app.js > dist/simply.everything.js
cp js/simply.include.next.js dist/