# Introduction

SimplyView is a set of seperate components that allow you to rapidly build web 
application user interfaces.

SimplyView seperates structure - HTML - from behaviour - javascript. There is 
never a need to write HTML inside your javascript code. There is also never a 
need to write javascript - or any other kind of code - inside your HTML. 
This strict seperation allows for a much easier workflow between designers and developers.

This seperation also makes it possible, even easy, to re-use and upgrade 
existing web applications. There is no need to rewrite everthing from scratch. 
SimplyView works well with jQuery. In rare cases you can use the simply.activate 
component to make sure your legacy javascript can react to changes in the HTML 
structure.

SimplyView is not a framework, but a selection of components. There is a
simply.app component which ties them all together, but you don't need it to
use any of them.

- [simply.action](simply.action.md)
- [simply.activate](simply.activate.md)
- [simply.app](simply.app.md)
- [simply.collect](simply.collect.md)
- [simply.command](simply.command.md)
- [simply.include](simply.include.md)
- [simply.key](simply.key.md)
- [simply.route](simply.route.md)
- [simply.view](simply.view.md)

Here are [some examples](examples.md) that use parts of SimplyView.