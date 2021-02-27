# simply.command

simply.command provides a way to tie behaviour (javascript code) to HTML
elements:
```html
<button data-simply-command="doSomething">does something</button>
```

Commands can be set on any HTML element, but the behaviour differs based on 
the element type:

- BUTTON, A:
  Command triggers on click. Value is copied from the data-simply-value attribute.
- INPUT, TEXTAREA, SELECT:
  Command triggers on change. Value is copied from the input value.
- FORM:
  Command triggers on submit. Value is the set of form values.
- All others:
  Command triggers on click. Value is copied from the data-simply-value 
  attribute. Only runs if no other command handlers match.

If a command is triggered, the default event handler is cancelled. So links 
aren't followed, forms aren't submitted, etc.

Initialize the commands like this:

```javascript
var commands = simply.command(myApp, {
  myCommand: function(el, value) {
    doSomething(value);
  }
});
```

For basic applications, commands are sufficient. But once your application 
gets more complex it pays to limit the code in commands to just the parts that 
tie into the HTML structure of your application. So searching the DOM, 
getting attribute values, etc. 

Once that is done, you should call an internal function that doesn't know 
anything about the exact HTML structure. [simply.action](simply.action.md) 
is purpose build to be used in that way. The Todo example shows how you can use this.

## commands.action

Each command function runs with the commands object returned from 
simply.command as its scope. The action method is a useful shortcut to app.actions:

```javascript
var myApp = simply.app({
  commands: {
    addTodo: function(form, values) {
      form.elements.todo.value = '';
      this.action.call('addTodo', values.todo);
    }
  },

  actions: {
    addTodo: function(todo) {
      this.app.view.todos.push(todo);
    }
  }
});
```

The same thing can also be accomplished like this:
```javascript
this.app.actions.addTodo(values.todo);
```

## commands.call

Allows you to call a command directly:
```javascript
myApp.commands.call('addTodo', el, value);
```

## commands.appendHandler

Adds a command handler on top of the existing ones, so it gets matched first.

```javascript
myApp.commands.appendHandler({
  match: 'input[type="radio"]',

  check: function(el, evt) {
    return (evt.type=='change');
  },

  get: function(el) {
    return el.dataset.simplyValue || el.value;
  }
});
```

Handler properties:

- match:
  A CSS selector that checks if an element is handled by this command handler.
- check:
  A function that checks if the command should be run in this event.
- get:
  A function that returns the value for this command.

## commands.prependHandler

Adds a command handler, just like appendHandler. But it adds it first in the 
list, so it will be matched last. This way you can add handlers with a more 
generic CSS selector and append more specific handlers.

