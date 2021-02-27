# Examples

## Counter

The counter app is an example to introduce the basic concepts. Here is the HTML:

```html
<div id="counterApp">
    <input type="text" data-simply-field="counter">
    <button data-simply-command="add1">+</button>
    <button data-simply-command="sub1">-</button>
    <div>Counter is now: <span data-simply-field="counter"></span></div>
</div>
```

It uses two components of SimplyView and SimplyEdit, through 
`data-simply-command` and `data-simply-field`.

`data-simply-command` is handled by [simply.command](simply.command.md). Both 
commands are defined on buttons, so they will trigger when the button is 
pressed. The javascript code tied to these commands is defined with the 
[simply.app](simply.app.md) component:

```javascript
var counterApp = simply.app({
    container: document.getElementById('counterApp'),
    commands: {
        add1: function() {
            counterApp.view.counter++;
        },
        sub1: function() {
            counterApp.view.counter--;
        }
    },
    view: {
        counter: 1
    }
});
```

simply.app is a wrapper that combines a number of components with a single 
configuration parameter. The commands section here is passed on to simply.command. 

When you press the button with `data-simply-command="add1"`, the command 
handler for this app is triggered and searches its commands for 'add1'. 
It then calls this javascript function and it will increase
`counterApp.view.counter`.

This is where the second component, which uses `data-simply-field`, comes in. 
The `counterApp.view` object is automatically tied to SimplyEdit, by simply.app. 
So whenever you update a variable inside `counterApp.view`, SimplyEdit will 
also update any HTML element which references the same variable. 

In this case `counterApp.view.counter` is tied to the input element with
`data-simply-field="counter"`.

SimplyEdit also does the reverse, whenever you change the input value, 
SimplyEdit will also change the `counterApp.view.counter` value. This is called 
two-way databinding.

Two-way databinding is not instantanous, so whenever you change a value in 
javascript or in the DOM, it will take a short while for SimplyEdit to update 
the other side as well. There are a number of events that will tell you when 
the values are in sync again.

## Todo

The TodoMVC application is a standard web application implemented in many different 
javascript frameworks. We've build one using SimplyEdit and SimplyView, which you 
can find at [todomvc.simplyedit.io](https://todomvc.simplyedit.io/).

The code is on github at
[github.com/simplyedit/todomvc](https://github.com/simplyedit/todomvc). The 
Readme explains how it is build.

## Hackernews PWA

Just like the TodoMVC application, the Hackernews PWA is also a standard web 
application implemented in many frameworks. You can find the SimplyEdit/SimplyView 
version at [hnpwa.simplyedit.io](https://hnpwa.simplyedit.io/). The code is at 
[github.com/simplyedit/hnpwa](https://github.com/simplyedit/hnpwa) and the 
Readme explains how it was built. 
