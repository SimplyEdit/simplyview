(() => {
  // src/route.mjs
  function routes(options, optionsCompat) {
    if (optionsCompat) {
      let app2 = options;
      options = optionsCompat;
      options.app = options;
    }
    return new SimplyRoute(options);
  }
  var SimplyRoute = class {
    constructor(options = {}) {
      this.baseURL = options.baseURL || "/";
      this.app = options.app || {};
      this.addMissingSlash = !!options.addMissingSlash;
      this.matchExact = !!options.matchExact;
      this.clear();
      if (options.routes) {
        this.load(options.routes);
      }
    }
    load(routes2) {
      parseRoutes(routes2, this.routeInfo, this.matchExact);
    }
    clear() {
      this.routeInfo = [];
      this.listeners = {
        match: {},
        call: {},
        goto: {},
        finish: {}
      };
    }
    match(path, options) {
      let args = {
        path,
        options
      };
      args = this.runListeners("match", args);
      path = args.path ? args.path : path;
      let matches;
      if (!path) {
        if (this.has(document.location.pathname + document.location.hash)) {
          path = document.location.pathname + document.location.hash;
        } else {
          path = document.location.pathname;
        }
      }
      path = getPath(path, this.baseURL);
      for (let route of this.routeInfo) {
        matches = route.match.exec(path);
        if (this.addMissingSlash && !matches?.length) {
          if (path && path[path.length - 1] != "/") {
            matches = route.match.exec(path + "/");
            if (matches) {
              path += "/";
              history.replaceState({}, "", getURL(path, this.baseURL));
            }
          }
        }
        if (matches && matches.length) {
          let params = {};
          route.params.forEach((key, i) => {
            if (key == "*") {
              key = "remainder";
            }
            params[key] = matches[i + 1];
          });
          Object.assign(params, options);
          args.route = route;
          args.params = params;
          args = this.runListeners("call", args);
          params = args.params ? args.params : params;
          const searchParams = new URLSearchParams(document.location.search);
          args.result = route.action.call(this.app, params, searchParams);
          this.runListeners("finish", args);
          return args.result;
        }
      }
      return false;
    }
    runListeners(action, params) {
      if (!this.listeners[action] || !Object.keys(this.listeners[action])) {
        return;
      }
      Object.keys(this.listeners[action]).forEach((route) => {
        var routeRe = getRegexpFromRoute(route);
        if (routeRe.exec(params.path)) {
          var result;
          for (let callback of this.listeners[action][route]) {
            result = callback.call(this.app, params);
            if (result) {
              params = result;
            }
          }
        }
      });
      return params;
    }
    handleEvents() {
      globalThis.addEventListener("popstate", () => {
        this.match();
      });
      this.app.container.addEventListener("click", (evt) => {
        if (evt.ctrlKey) {
          return;
        }
        if (evt.which != 1) {
          return;
        }
        var link = evt.target;
        while (link && link.tagName != "A") {
          link = link.parentElement;
        }
        if (link && link.pathname && link.hostname == globalThis.location.hostname && !link.link && !link.dataset.simplyCommand) {
          let check = [link.hash, link.pathname + link.hash, link.pathname];
          let path;
          do {
            path = getPath(check.shift(), this.baseURL);
          } while (check.length && !this.has(path));
          if (this.has(path)) {
            let params = this.runListeners("goto", { path });
            if (params.path) {
              if (this.goto(params.path)) {
                evt.preventDefault();
                return false;
              }
            }
          }
        }
      });
    }
    goto(path) {
      history.pushState({}, "", getURL(path, this.baseURL));
      return this.match(path);
    }
    has(path) {
      path = getPath(path, this.baseURL);
      for (let route of this.routeInfo) {
        var matches = route.match.exec(path);
        if (matches && matches.length) {
          return true;
        }
      }
      return false;
    }
    addListener(action, route, callback) {
      if (["goto", "match", "call", "finish"].indexOf(action) == -1) {
        throw new Error("Unknown action " + action);
      }
      if (!this.listeners[action][route]) {
        this.listeners[action][route] = [];
      }
      this.listeners[action][route].push(callback);
    }
    removeListener(action, route, callback) {
      if (["match", "call", "finish"].indexOf(action) == -1) {
        throw new Error("Unknown action " + action);
      }
      if (!this.listeners[action][route]) {
        return;
      }
      this.listeners[action][route] = this.listeners[action][route].filter((listener) => {
        return listener != callback;
      });
    }
    init(options) {
      if (options.baseURL) {
        this.baseURL = options.baseURL;
      }
    }
  };
  function getPath(path, baseURL = "/") {
    if (path.substring(0, baseURL.length) == baseURL || baseURL[baseURL.length - 1] == "/" && path.length == baseURL.length - 1 && path == baseURL.substring(0, path.length)) {
      path = path.substring(baseURL.length);
    }
    if (path[0] != "/") {
      path = "/" + path;
    }
    return path;
  }
  function getURL(path, baseURL) {
    path = getPath(path, baseURL);
    if (baseURL[baseURL.length - 1] === "/" && path[0] === "/") {
      path = path.substring(1);
    }
    if (path[0] == "#") {
      return path;
    }
    return baseURL + path;
  }
  function getRegexpFromRoute(route, exact = false) {
    if (route[0] != "#") {
      route = "^" + route;
    }
    if (exact) {
      return new RegExp(route.replace(/:\w+/g, "([^/]+)").replace(/:\*/, "(.*)") + "(\\?|$)");
    }
    return new RegExp(route.replace(/:\w+/g, "([^/]+)").replace(/:\*/, "(.*)"));
  }
  function parseRoutes(routes2, routeInfo, exact = false) {
    const paths = Object.keys(routes2);
    const matchParams = /:(\w+|\*)/g;
    for (let path of paths) {
      let matches = [];
      let params = [];
      do {
        matches = matchParams.exec(path);
        if (matches) {
          params.push(matches[1]);
        }
      } while (matches);
      routeInfo.push({
        match: getRegexpFromRoute(path, exact),
        params,
        action: routes2[path]
      });
    }
    return routeInfo;
  }

  // src/command.mjs
  var SimplyCommands = class {
    constructor(options = {}) {
      if (!options.app) {
        options.app = {};
      }
      if (!options.app.container) {
        options.app.container = document.body;
      }
      this.app = options.app;
      this.$handlers = options.handlers || defaultHandlers;
      if (options.commands) {
        Object.assign(this, options.commands);
      }
      const commandHandler = (evt) => {
        const command = getCommand(evt, this.$handlers);
        if (!command) {
          return;
        }
        if (!this[command.name]) {
          console.error("simply.command: undefined command " + command.name, command.source);
          return;
        }
        const shouldContinue = this[command.name].call(options.app, command.source, command.value);
        if (shouldContinue !== true) {
          evt.preventDefault();
          evt.stopPropagation();
          return false;
        }
      };
      options.app.container.addEventListener("click", commandHandler);
      options.app.container.addEventListener("submit", commandHandler);
      options.app.container.addEventListener("change", commandHandler);
      options.app.container.addEventListener("input", commandHandler);
    }
    call(command, el, value) {
      if (!this[command]) {
        console.error("simply.command: undefined command " + command);
        return;
      }
      return this[command].call(this.app, el, value);
    }
    action(name) {
      console.warn("deprecated call to `this.commands.action`");
      let params = Array.from(arguments).slice();
      params.shift();
      return this.app.actions[name](...params);
    }
    appendHandler(handler) {
      this.$handlers.push(handler);
    }
    prependHandler(handler) {
      this.$handlers.unshift(handler);
    }
  };
  function commands(options = {}, optionsCompat) {
    if (optionsCompat) {
      let app2 = options;
      options = optionsCompat;
      options.app = options;
    }
    return new SimplyCommands(options);
  }
  function getCommand(evt, handlers) {
    var el = evt.target.closest("[data-simply-command]");
    if (el) {
      for (let handler of handlers) {
        if (el.matches(handler.match)) {
          if (handler.check(el, evt)) {
            return {
              name: el.dataset.simplyCommand,
              source: el,
              value: handler.get(el)
            };
          }
          return null;
        }
      }
    }
    return null;
  }
  var defaultHandlers = [
    {
      match: "input,select,textarea",
      get: function(el) {
        if (el.tagName === "SELECT" && el.multiple) {
          let values = [];
          for (let option of el.options) {
            if (option.selected) {
              values.push(option.value);
            }
          }
          return values;
        }
        return el.dataset.simplyValue || el.value;
      },
      check: function(el, evt) {
        return evt.type == "change" || el.dataset.simplyImmediate && evt.type == "input";
      }
    },
    {
      match: "a,button",
      get: function(el) {
        return el.dataset.simplyValue || el.href || el.value;
      },
      check: function(el, evt) {
        return evt.type == "click" && evt.ctrlKey == false && evt.button == 0;
      }
    },
    {
      match: "form",
      get: function(el) {
        let data = {};
        for (let input of Array.from(el.elements)) {
          if (input.tagName == "INPUT" && (input.type == "checkbox" || input.type == "radio")) {
            if (!input.checked) {
              return;
            }
          }
          if (data[input.name] && !Array.isArray(data[input.name])) {
            data[input.name] = [data[input.name]];
          }
          if (Array.isArray(data[input.name])) {
            data[input.name].push(input.value);
          } else {
            data[input.name] = input.value;
          }
        }
        return data;
      },
      check: function(el, evt) {
        return evt.type == "submit";
      }
    },
    {
      match: "*",
      get: function(el) {
        return el.dataset.simplyValue;
      },
      check: function(el, evt) {
        return evt.type == "click" && evt.ctrlKey == false && evt.button == 0;
      }
    }
  ];

  // src/action.mjs
  function actions(options, optionsCompat) {
    if (optionsCompat) {
      let app2 = options;
      options = optionsCompat;
      options.app = app2;
    }
    if (options.app) {
      const functionHandler = {
        apply(target, thisArg, argumentsList) {
          try {
            const result = target(...argumentsList);
            if (result instanceof Promise) {
              return result.catch((err) => {
                return options.app.hooks.error.call(this, err, target);
              });
            }
            return result;
          } catch (err) {
            return options.app.hooks.error.call(this, err, target);
          }
        }
      };
      const actionHandler = {
        get(target, property) {
          if (!target[property]) {
            return void 0;
          }
          if (options.app.hooks?.error) {
            return new Proxy(target[property].bind(options.app), functionHandler);
          } else {
            return target[property].bind(options.app);
          }
        }
      };
      return new Proxy(options.actions, actionHandler);
    } else {
      return options;
    }
  }

  // src/dom.mjs
  function findAttribute(el, attr) {
    return el.closest("[" + attr + "]")?.getAttribute(attr);
  }

  // src/key.mjs
  var KEY = Object.freeze({
    Compose: 229,
    Control: 17,
    Meta: 224,
    Alt: 18,
    Shift: 16
  });
  var SimplyKey = class {
    constructor(options = {}) {
      if (!options.app) {
        options.app = {};
      }
      if (!options.app.container) {
        options.app.container = document.body;
      }
      Object.assign(this, options.keys);
      const keyHandler = (e) => {
        let keyboards = [];
        let keyboardElement = event.target.closest("[data-simply-keyboard]");
        while (keyboardElement) {
          keyboards.push(keyboardElement.dataset.simplyKeyboard);
          keyboardElement = keyboardElement.parentNode.closest("[data-simply-keyboard]");
        }
        if (keyboards[keyboards.length - 1] != "default") {
          keyboards.push("default");
        }
        let keyboard;
        let separators = ["-", "+"];
        for (let separator of separators) {
          const keyString = getKeyString(e, separator);
          for (let i in keyboards) {
            keyboard = keyboards[i];
            if (this[keyboard] && typeof this[keyboard][keyString] == "function") {
              let _continue = this[keyboard][keyString].call(options.app, e);
              if (!_continue) {
                e.preventDefault();
                return;
              }
            }
            if (typeof this[keyboard + "." + keyString] == "function") {
              let _continue = this[keyboard + "." + keyString].call(options.app, e);
              if (!_continue) {
                e.preventDefault();
                return;
              }
            }
          }
        }
      };
      options.app.container.addEventListener("keydown", keyHandler);
    }
  };
  function getKeyString(e, separator = "+") {
    if (e.isComposing || e.keyCode === KEY.Compose) {
      return;
    }
    if (e.defaultPrevented) {
      return;
    }
    if (!e.target) {
      return;
    }
    let selectedKeyboard = "default";
    if (e.target.closest("[data-simply-keyboard]")) {
      selectedKeyboard = e.target.closest("[data-simply-keyboard]").dataset.simplyKeyboard;
    }
    let keyCombination = [];
    if (e.ctrlKey && e.keyCode != KEY.Control) {
      keyCombination.push("Control");
    }
    if (e.metaKey && e.keyCode != KEY.Meta) {
      keyCombination.push("Meta");
    }
    if (e.altKey && e.keyCode != KEY.Alt) {
      keyCombination.push("Alt");
    }
    if (e.shiftKey && e.keyCode != KEY.Shift) {
      keyCombination.push("Shift");
    }
    keyCombination.push(e.key.toLowerCase());
    return keyCombination.join(separator);
  }
  function keys(options = {}, optionsCompat) {
    if (optionsCompat) {
      let app2 = options;
      options = optionsCompat;
      options.app = options;
    }
    return new SimplyKey(options);
  }
  function accesskeys(app2) {
    const container = app2.container || document.body;
    container.addEventListener("keydown", (e) => {
      const keyString = getKeyString(e, "-");
      const selector = "[data-simply-accesskey='" + keyString + "']";
      const targets = container.querySelectorAll(selector);
      if (targets.length) {
        targets.forEach(function(target) {
          target.click();
        });
      }
    });
  }

  // src/view.mjs
  function view(options, optionsCompat) {
    if (optionsCompat) {
      let app2 = options;
      options = optionsCompat;
      options.app = options;
    }
    if (options.app) {
      options.app.view = options.view || {};
      const load = () => {
        const data = options.app.view;
        const path = globalThis.editor.data.getDataPath(options.app.container || document.body);
        options.app.view = globalThis.editor.currentData[path];
        Object.assign(options.app.view, data);
      };
      if (globalThis.editor && globalThis.editor.currentData) {
        load();
      } else {
        document.addEventListener("simply-content-loaded", load);
      }
      return options.app.view;
    } else {
      return options.view;
    }
  }

  // src/highlight.mjs
  function html(strings, ...values) {
    const outputArray = values.map(
      (value, index) => `${strings[index]}${value}`
    );
    return outputArray.join("") + strings[strings.length - 1];
  }
  function css(strings, ...values) {
    return html(strings, ...values);
  }

  // src/app.mjs
  var SimplyApp = class {
    constructor(options = {}) {
      this.container = options.container || document.body;
      if (options.components) {
        let tempOptions = {};
        mergeComponents(tempOptions, options.components);
        mergeOptions(tempOptions, options);
        options = tempOptions;
      }
      for (let key in options) {
        switch (key) {
          case "html":
            for (const name in options.html) {
              const element = document.createElement("div");
              element.innerHTML = options.html[name];
              let template = this.container.querySelector("template#" + name);
              if (!template) {
                template = document.createElement("template");
                template.id = name;
                template.content.append(...element.children);
                this.container.appendChild(template);
              } else {
                template.content.replaceChildren(...element.children);
              }
            }
            break;
          case "css":
            for (const name in options.css) {
              let style = this.container.querySelector("style#" + name);
              if (!style) {
                style = document.createElement("style");
                style.id = name;
                this.container.appendChild(style);
              }
              style.innerHTML = options.css[name];
            }
            break;
          case "commands":
            this.commands = commands({ app: this, container: this.container, commands: options.commands });
            break;
          case "keys":
          case "keyboard":
            this.keys = keys({ app: this, keys: options.keys });
            break;
          case "root":
          // backwards compatibility
          case "baseURL":
            this.baseURL = options[key];
            break;
          case "routes":
            this.routes = routes({ app: this, routes: options.routes });
            break;
          case "actions":
            this.actions = actions({ app: this, actions: options.actions });
            this.action = function(name) {
              console.warn("deprecated call to `this.action`");
              let params = Array.from(arguments).slice();
              params.shift();
              return this.actions[name](...params);
            };
            break;
          case "view":
            this.view = view({ app: this, view: options.view });
            break;
          case "hooks":
          case "components":
            this[key] = options[key];
            break;
          case "prototype":
          case "__proto__":
            break;
          default:
            console.log('simply.app: unknown initialization option "' + key + '", added as-is');
            this[key] = options[key];
            break;
        }
      }
      accesskeys({ app: this });
    }
    get app() {
      return this;
    }
    findAttribute(...params) {
      return findAttribute.apply(this, params);
    }
  };
  function initRoutes(app2) {
    if (app2.routes) {
      if (app2.baseURL) {
        app2.routes.init({ baseURL: this.baseURL });
      }
      app2.routes.handleEvents();
      globalThis.setTimeout(() => {
        if (app2.routes.has(globalThis.location?.hash)) {
          app2.routes.match(globalThis.location.hash);
        } else {
          app2.routes.match(globalThis.location?.pathname + globalThis.location?.hash);
        }
      });
    }
  }
  function app(options = {}) {
    const app2 = new SimplyApp(options);
    if (app2.hooks?.start) {
      app2.hooks.start.call(app2).then(() => initRoutes(app2));
    } else {
      initRoutes(app2);
    }
    return app2;
  }
  if (!globalThis.html) {
    globalThis.html = html;
  }
  if (!globalThis.css) {
    globalThis.css = css;
  }
  function mergeOptions(options, otherOptions) {
    for (const key in otherOptions) {
      switch (typeof otherOptions[key]) {
        case "object":
          if (!otherOptions[key]) {
            continue;
          }
          if (!options[key]) {
            options[key] = otherOptions[key];
          } else {
            mergeOptions(options[key], otherOptions[key]);
          }
          break;
        default:
          options[key] = otherOptions[key];
      }
    }
  }
  function mergeComponents(options, components) {
    for (const name in components) {
      const component = components[name];
      if (component.components) {
        mergeComponents(options, component.components);
      }
      if (!options.components) {
        options.components = {};
      }
      options.components[name] = component;
      for (const key in component) {
        switch (key) {
          case "hooks":
          // don't merge these, app.hooks.start will trigger each components start hook
          case "components":
            break;
          default:
            if (!options[key]) {
              options[key] = /* @__PURE__ */ Object.create(null);
            }
            mergeOptions(options[key], component[key]);
            break;
        }
      }
    }
  }
})();
