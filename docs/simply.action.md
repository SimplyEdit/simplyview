# simply.action

Actions are a standardized way to define a kind of API for your user 
interface. They are meant to be used together with routes and commands. 

In this case the routes and commands are tightly bound to your URL 
structure and your HTML structure respectively. 

Actions should be decoupled from those. An action should just be a method 
that updates the application state. The parameters for an action should 
be the logical parameters for that update.

```javascript
var myApp = simply.app({
  commands: {
    addTodo: function(form, values) {
      form.elements.todo.value = '';
      this.app.actions.addTodo(values.todo);
    }
  },

  actions: {
    addTodo: function(todo) {
      this.app.view.todos.push(todo);
    }
  }
});
```

By structuring your application in this way, it is easy to add different 
user interface modes which accomplish the same action. So you can create a 
route as well as a command, that both trigger the same action. Or later you 
can add keyboard shortcuts or gestures, without having to copy the logic of 
your action.

You can add actions later by just defining them in the actions object:

```javascript
myApp.actions.anotherAction = function(...arguments) {
   ...
};
```
