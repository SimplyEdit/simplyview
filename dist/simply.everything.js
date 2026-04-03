(() => {
  // src/activate.mjs
  if (!Symbol.onDestroy) {
    Symbol.onDestroy = Symbol("onDestroy");
  }
  var listeners = /* @__PURE__ */ new Map();
  var activate = {
    addListener: (name, callback) => {
      if (!listeners.has(name)) {
        listeners.set(name, []);
      }
      listeners.get(name).push(callback);
      initialCall(name);
    },
    removeListener: (name, callback) => {
      if (!listeners.has(name)) {
        return false;
      }
      listeners.set(name, listeners.get(name).filter((listener) => {
        return listener != callback;
      }));
    }
  };
  function initialCall(name) {
    const nodes = document.querySelectorAll('[data-simply-activate="' + name + '"]');
    if (nodes) {
      for (let node of nodes) {
        callListeners(node);
      }
    }
  }
  function callListeners(node) {
    const activate2 = node?.dataset?.simplyActivate;
    if (activate2 && listeners.has(activate2)) {
      for (let callback of listeners.get(activate2)) {
        const onDestroy = callback.call(node);
        if (typeof onDestroy == "function") {
          node[Symbol.onDestroy] = onDestroy;
        } else if (typeof onDestroy != "undefined") {
          console.warn("activate listener may only return a de-activate function, instead got", onDestroy);
        }
      }
    }
  }
  function handleChanges(changes) {
    let activateNodes = [];
    for (let change of changes) {
      if (change.type == "childList") {
        for (let node of change.addedNodes) {
          if (node.querySelectorAll) {
            let toActivate = Array.from(node.querySelectorAll("[data-simply-activate]"));
            if (node.matches("[data-simply-activate]")) {
              toActivate.push(node);
            }
            activateNodes = activateNodes.concat(toActivate);
          }
        }
        for (let node of change.removedNodes) {
          if (node.querySelectorAll) {
            let toDestroy = Array.from(node.querySelectorAll("[data-simply-activate]"));
            if (node.matches["[data-simply-activate"]) {
              toDestroy.push(node);
            }
            for (let child of toDestroy) {
              if (child[Symbol.onDestroy]) {
                child[Symbol.onDestroy].call(child);
              }
            }
          }
        }
      }
    }
    for (let node of activateNodes) {
      callListeners(node);
    }
  }
  var observer = new MutationObserver(handleChanges);
  observer.observe(document, {
    subtree: true,
    childList: true
  });

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
      this.hijackLinks = !!options.hijackLinks;
      this.clear();
      if (options.routes) {
        this.load(options.routes);
      }
      if (globalThis.simply) {
        globalThis.simply.route = this;
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
    match(path2, options) {
      let args = {
        path: path2,
        options
      };
      args = this.runListeners("match", args);
      path2 = args.path ? args.path : path2;
      let matches;
      if (!path2) {
        if (this.has(document.location.pathname + document.location.hash)) {
          path2 = document.location.pathname + document.location.hash;
        } else {
          path2 = document.location.pathname;
        }
      }
      path2 = getPath(path2, this.baseURL);
      for (let route of this.routeInfo) {
        matches = route.match.exec(path2);
        if (this.addMissingSlash && !matches?.length) {
          if (path2 && path2[path2.length - 1] != "/") {
            matches = route.match.exec(path2 + "/");
            if (matches) {
              path2 += "/";
              history.replaceState({}, "", getURL(path2, this.baseURL));
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
          let path2;
          do {
            path2 = getPath(check.shift(), this.baseURL);
          } while (check.length && !this.has(path2));
          if (this.has(path2)) {
            let params = this.runListeners("goto", { path: path2 });
            if (params.path) {
              const followLink = this.goto(params.path);
              if (!followLink || this.options.hijackLinks && followLink !== false) {
                evt.preventDefault();
                return false;
              }
            }
          }
        }
      });
    }
    goto(path2) {
      history.pushState({}, "", getURL(path2, this.baseURL));
      return this.match(path2);
    }
    has(path2) {
      path2 = getPath(path2, this.baseURL);
      for (let route of this.routeInfo) {
        var matches = route.match.exec(path2);
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
  function getPath(path2, baseURL = "/") {
    if (path2.substring(0, baseURL.length) == baseURL || baseURL[baseURL.length - 1] == "/" && path2.length == baseURL.length - 1 && path2 == baseURL.substring(0, path2.length)) {
      path2 = path2.substring(baseURL.length);
    }
    if (path2[0] != "/") {
      path2 = "/" + path2;
    }
    return path2;
  }
  function getURL(path2, baseURL) {
    path2 = getPath(path2, baseURL);
    if (baseURL[baseURL.length - 1] === "/" && path2[0] === "/") {
      path2 = path2.substring(1);
    }
    if (path2[0] == "#") {
      return path2;
    }
    return baseURL + path2;
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
    for (let path2 of paths) {
      let matches = [];
      let params = [];
      do {
        matches = matchParams.exec(path2);
        if (matches) {
          params.push(matches[1]);
        }
      } while (matches);
      routeInfo.push({
        match: getRegexpFromRoute(path2, exact),
        params,
        action: routes2[path2]
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
        let separators = ["+", "-"];
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
            if (typeof this[keyString] == "function") {
              let _continue = this[keyString].call(options.app, e);
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
      const separators = ["+", "-"];
      for (const separator of separators) {
        const keyString = getKeyString(e, separator);
        const selector = "[data-simply-accesskey='" + keyString + "']";
        const targets = container.querySelectorAll(selector);
        if (targets.length) {
          targets.forEach(function(target) {
            target.click();
          });
        }
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
        const path2 = globalThis.editor.data.getDataPath(options.app.container || document.body);
        options.app.view = globalThis.editor.currentData[path2];
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
                style.id = name + ".css";
                this.container.appendChild(style);
              }
              style.innerHTML = options.css[name];
            }
            break;
          case "commands":
            this.commands = commands({ app: this, container: this.container, commands: options.commands });
            break;
          case "keys":
            this.keys = keys({ app: this, keys: options.keys });
            break;
          case "keyboard":
            this.keys = keys({ app: this, keys: options.keyboard });
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
      const promise = app2.hooks.start.call(app2);
      if (promise instanceof Promise) {
        promise.then(() => initRoutes(app2));
      } else {
        initRoutes(app2);
      }
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

  // src/include.mjs
  function throttle(callbackFunction, intervalTime) {
    let eventId = 0;
    return () => {
      const myArguments = arguments;
      if (eventId) {
        return;
      } else {
        eventId = globalThis.setTimeout(() => {
          callbackFunction.apply(this, myArguments);
          eventId = 0;
        }, intervalTime);
      }
    };
  }
  var runWhenIdle = (() => {
    if (globalThis.requestIdleCallback) {
      return (callback) => {
        globalThis.requestIdleCallback(callback, { timeout: 500 });
      };
    }
    return globalThis.requestAnimationFrame;
  })();
  function rebaseHref(relative, base) {
    let url = new URL(relative, base);
    if (include.cacheBuster) {
      url.searchParams.set("cb", include.cacheBuster);
    }
    return url.href;
  }
  var observer2;
  var loaded = {};
  var head = globalThis.document.querySelector("head");
  var currentScript = globalThis.document.currentScript;
  var getScriptURL;
  var currentScriptURL;
  if (!currentScript) {
    getScriptURL = (() => {
      var scripts = document.getElementsByTagName("script");
      var index = scripts.length - 1;
      var myScript = scripts[index];
      return () => myScript?.src;
    })();
    currentScriptURL = getScriptURL();
  } else {
    currentScriptURL = currentScript.src;
  }
  var waitForPreviousScripts = async () => {
    return new Promise(function(resolve) {
      var next = globalThis.document.createElement("script");
      next.src = "https://cdn.jsdelivr.net/gh/simplyedit/simplyview/dist/simply.include.next.js";
      next.async = false;
      globalThis.document.addEventListener("simply-include-next", () => {
        head.removeChild(next);
        resolve();
      }, { once: true, passive: true });
      head.appendChild(next);
    });
  };
  var scriptLocations = [];
  var include = {
    cacheBuster: null,
    scripts: (scripts, base) => {
      let arr = scripts.slice();
      const importScript = () => {
        const script = arr.shift();
        if (!script) {
          return;
        }
        const attrs = [].map.call(script.attributes, (attr) => {
          return attr.name;
        });
        let clone = globalThis.document.createElement("script");
        for (const attr of attrs) {
          clone.setAttribute(attr, script.getAttribute(attr));
        }
        clone.removeAttribute("data-simply-location");
        if (!clone.src) {
          clone.innerHTML = script.innerHTML;
          waitForPreviousScripts().then(() => {
            const node = scriptLocations[script.dataset.simplyLocation];
            node.parentNode.insertBefore(clone, node);
            node.parentNode.removeChild(node);
            importScript();
          });
        } else {
          clone.src = rebaseHref(clone.src, base);
          if (!clone.hasAttribute("async") && !clone.hasAttribute("defer")) {
            clone.async = false;
          }
          const node = scriptLocations[script.dataset.simplyLocation];
          node.parentNode.insertBefore(clone, node);
          node.parentNode.removeChild(node);
          loaded[clone.src] = true;
          importScript();
        }
      };
      if (arr.length) {
        importScript();
      }
    },
    html: (html2, link) => {
      let fragment = globalThis.document.createRange().createContextualFragment(html2);
      const stylesheets = fragment.querySelectorAll('link[rel="stylesheet"],style');
      for (let stylesheet of stylesheets) {
        if (stylesheet.href) {
          stylesheet.href = rebaseHref(stylesheet.href, link.href);
        }
        head.appendChild(stylesheet);
      }
      let scriptsFragment = globalThis.document.createDocumentFragment();
      const scripts = fragment.querySelectorAll("script");
      if (scripts.length) {
        for (let script of scripts) {
          let placeholder = globalThis.document.createComment(script.src || "inline script");
          script.parentNode.insertBefore(placeholder, script);
          script.dataset.simplyLocation = scriptLocations.length;
          scriptLocations.push(placeholder);
          scriptsFragment.appendChild(script);
        }
        globalThis.setTimeout(function() {
          include.scripts(Array.from(scriptsFragment.children), link ? link.href : globalThis.location.href);
        }, 10);
      }
      link.parentNode.insertBefore(fragment, link ? link : null);
    }
  };
  var included = {};
  var includeLinks = async (links) => {
    let remainingLinks = [].reduce.call(links, (remainder, link) => {
      if (link.rel == "simply-include-once" && included[link.href]) {
        link.parentNode.removeChild(link);
      } else {
        included[link.href] = true;
        link.rel = "simply-include-loading";
        remainder.push(link);
      }
      return remainder;
    }, []);
    for (let link of remainingLinks) {
      if (!link.href) {
        return;
      }
      const response = await fetch(link.href);
      if (!response.ok) {
        console.log("simply-include: failed to load " + link.href);
        continue;
      }
      console.log("simply-include: loaded " + link.href);
      const html2 = await response.text();
      include.html(html2, link);
      link.parentNode.removeChild(link);
    }
  };
  var handleChanges2 = throttle(() => {
    runWhenIdle(() => {
      var links = globalThis.document.querySelectorAll('link[rel="simply-include"],link[rel="simply-include-once"]');
      if (links.length) {
        includeLinks(links);
      }
    });
  });
  var observe = () => {
    observer2 = new MutationObserver(handleChanges2);
    observer2.observe(globalThis.document, {
      subtree: true,
      childList: true
    });
  };
  observe();
  handleChanges2();

  // src/path.mjs
  var path = {
    get(dataset, pointer) {
      if (typeof pointer !== "string") {
        return pointer;
      }
      if (!pointer) {
        return dataset;
      }
      return pointer.split(".").reduce(function(acc, name) {
        return acc && acc[name] ? acc[name] : null;
      }, dataset);
    },
    set: function(dataset, pointer, value) {
      const parent = path.get(dataset, path.parent(pointer));
      parent[path.pop(pointer)] = value;
    },
    pop: function(pointer) {
      return pointer.split(".").pop();
    },
    push: function(pointer, name) {
      return (pointer ? pointer + "." : "") + name;
    },
    parent: function(dataset, pointer) {
      const names = pointer.split(".");
      names.pop();
      return names.join(".");
    },
    parents: function(dataset, pointer) {
      let result = [];
      while (pointer) {
        pointer = path.parent(pointer);
        result.unshift(pointer);
      }
    }
  };
  var path_default = path;

  // src/everything.mjs
  var simply = {
    activate,
    action: actions,
    app,
    command: commands,
    include,
    key: keys,
    path: path_default,
    route: new SimplyRoute(),
    view,
    findAttribute
  };
  globalThis.simply = simply;
  var everything_default = simply;
})();
