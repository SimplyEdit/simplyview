(() => {
  // src/route.mjs
  function routes(options) {
    return new SimplyRoute(options);
  }
  var SimplyRoute = class {
    constructor(options = {}) {
      this.root = options.root || "/";
      this.app = options.app;
      this.clear();
      if (options.routes) {
        this.load(options.routes);
      }
    }
    load(routes2) {
      parseRoutes(routes2, this.routeInfo);
    }
    clear() {
      this.routeInfo = [];
      this.listeners = {
        match: {},
        call: {},
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
        if (this.match(document.location.pathname + document.location.hash)) {
          return true;
        } else {
          return this.match(document.location.pathname);
        }
      }
      path = getPath(path);
      for (let route of this.routeInfo) {
        matches = route.match.exec(path);
        if (matches && matches.length) {
          var params = {};
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
          args.result = route.action.call(route, params);
          this.runListeners("finish", args);
          return args.result;
        }
      }
      if (path && path[path.length - 1] != "/") {
        return this.match(path + "/", options);
      }
      return false;
    }
    runListeners(action, params) {
      if (!Object.keys(this.listeners[action])) {
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
        if (this.match(getPath(document.location.pathname + document.location.hash, this.root)) === false) {
          this.match(getPath(document.location.pathname, this.root));
        }
      });
      globalThis.document.addEventListener("click", (evt) => {
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
          let path = getPath(link.pathname + link.hash, this.root);
          if (!this.has(path)) {
            path = getPath(link.pathname, this.root);
          }
          if (this.has(path)) {
            let params = this.runListeners("goto", { path });
            if (params.path) {
              this.goto(params.path);
            }
            evt.preventDefault();
            return false;
          }
        }
      });
    }
    goto(path) {
      history.pushState({}, "", getURL(path));
      return this.match(path);
    }
    has(path) {
      path = getPath(path, this.root);
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
      if (options.root) {
        this.root = options.root;
      }
    }
  };
  function getPath(path, root = "/") {
    if (path.substring(0, root.length) == root || root[root.length - 1] == "/" && path.length == root.length - 1 && path == root.substring(0, path.length)) {
      path = path.substring(root.length);
    }
    if (path[0] != "/" && path[0] != "#") {
      path = "/" + path;
    }
    return path;
  }
  function getURL(path, root) {
    path = getPath(path, root);
    if (root[root.length - 1] === "/" && path[0] === "/") {
      path = path.substring(1);
    }
    return root + path;
  }
  function getRegexpFromRoute(route) {
    return new RegExp("^" + route.replace(/:\w+/g, "([^/]+)").replace(/:\*/, "(.*)"));
  }
  function parseRoutes(routes2) {
    let routeInfo = [];
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
        match: getRegexpFromRoute(path),
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
      this.handlers = options.handlers || defaultHandlers;
      this.commands = options.commands || {};
      const commandHandler = (evt) => {
        const command = getCommand(evt, this.handlers);
        if (!command) {
          return;
        }
        if (!this.commands[command.name]) {
          console.error("simply.command: undefined command " + command.name, command.source);
          return;
        }
        this.commands[command.name].call(this.app, command.source, command.value);
      };
      function stop(fn) {
        return (evt) => {
          fn(evt);
          evt.preventDefault();
          evt.stopPropagation();
          return false;
        };
      }
      this.app.container.addEventListener("click", stop(commandHandler));
      this.app.container.addEventListener("submit", stop(commandHandler));
      this.app.container.addEventListener("change", commandHandler);
      this.app.container.addEventListener("input", commandHandler);
    }
  };
  function commands(options = {}) {
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
  var SimplyActions = class {
    constructor(options) {
      this.app = options.app;
      const actionHandler = {
        get: (target, property) => {
          return target[property].bind(this.app);
        }
      };
      this.actions = new Proxy({}, actionHandler);
      Object.assign(this.actions, options.actions);
    }
  };
  function actions(options) {
    return new SimplyActions(options);
  }

  // src/key.mjs
  var SimplyKeys = class {
    constructor(options = {}) {
      if (!options.app) {
        options.app = {};
      }
      if (!options.app.container) {
        options.app.container = document.body;
      }
      this.keys = options.keys || {};
      this.app = options.app;
      this.app.container.addEventListener("keydown", this.keyHandler());
    }
    keyHandler() {
      return (e) => {
        if (e.isComposing || e.keyCode === 229) {
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
        let key = "";
        if (e.ctrlKey && e.keyCode != 17) {
          key += "Control+";
        }
        if (e.metaKey && e.keyCode != 224) {
          key += "Meta+";
        }
        if (e.altKey && e.keyCode != 18) {
          key += "Alt+";
        }
        if (e.shiftKey && e.keyCode != 16) {
          key += "Shift+";
        }
        key += e.key;
        if (this.keys[selectedKeyboard] && this.keys[selectedKeyboard][key]) {
          let keyboard = this.keys[selectedKeyboard];
          keyboard[key].call(this.app, e);
        }
      };
    }
  };
  function keys(options = {}) {
    return new SimplyKeys(options);
  }

  // src/state.mjs
  var source = Symbol("source");
  var iterate = Symbol("iterate");
  var signalHandler = {
    get: (target, property, receiver) => {
      if (property === source) {
        return target;
      }
      const value = target?.[property];
      notifyGet(receiver, property);
      if (typeof value === "function") {
        if (Array.isArray(target)) {
          return (...args) => {
            let l = target.length;
            let result = value.apply(receiver, args);
            if (l != target.length) {
              notifySet(receiver, makeContext("length", { was: l, now: target.length }));
            }
            return result;
          };
        } else if (target instanceof Set || target instanceof Map) {
          return (...args) => {
            let s = target.size;
            let result = value.apply(target, args);
            if (s != target.size) {
              notifySet(receiver, makeContext("size", { was: s, now: target.size }));
            }
            if (["set", "add", "clear", "delete"].includes(property)) {
              notifySet(receiver, makeContext({ entries: {}, forEach: {}, has: {}, keys: {}, values: {}, [Symbol.iterator]: {} }));
            }
            return result;
          };
        } else {
          return value.bind(receiver);
        }
      }
      if (value && typeof value == "object") {
        return signal(value);
      }
      return value;
    },
    set: (target, property, value, receiver) => {
      value = value?.[source] || value;
      let current = target[property];
      if (current !== value) {
        target[property] = value;
        notifySet(receiver, makeContext(property, { was: current, now: value }));
      }
      if (typeof current === "undefined") {
        notifySet(receiver, makeContext(iterate, {}));
      }
      return true;
    },
    has: (target, property) => {
      let receiver = signals.get(target);
      if (receiver) {
        notifyGet(receiver, property);
      }
      return Object.hasOwn(target, property);
    },
    deleteProperty: (target, property) => {
      if (typeof target[property] !== "undefined") {
        let current = target[property];
        delete target[property];
        let receiver = signals.get(target);
        notifySet(receiver, makeContext(property, { delete: true, was: current }));
      }
      return true;
    },
    defineProperty: (target, property, descriptor) => {
      if (typeof target[property] === "undefined") {
        let receiver = signals.get(target);
        notifySet(receiver, makeContext(iterate, {}));
      }
      return Object.defineProperty(target, property, descriptor);
    },
    ownKeys: (target) => {
      let receiver = signals.get(target);
      notifyGet(receiver, iterate);
      return Reflect.ownKeys(target);
    }
  };
  var signals = /* @__PURE__ */ new WeakMap();
  function signal(v) {
    if (!signals.has(v)) {
      signals.set(v, new Proxy(v, signalHandler));
    }
    return signals.get(v);
  }
  var batchedListeners = /* @__PURE__ */ new Set();
  var batchMode = 0;
  function notifySet(self, context = {}) {
    let listeners = [];
    context.forEach((change, property) => {
      let propListeners = getListeners(self, property);
      if (propListeners?.length) {
        for (let listener of propListeners) {
          addContext(listener, makeContext(property, change));
        }
        listeners = listeners.concat(propListeners);
      }
    });
    listeners = new Set(listeners.filter(Boolean));
    if (listeners) {
      if (batchMode) {
        batchedListeners = batchedListeners.union(listeners);
      } else {
        const currentEffect = computeStack[computeStack.length - 1];
        for (let listener of Array.from(listeners)) {
          if (listener != currentEffect && listener?.needsUpdate) {
            listener();
          }
          clearContext(listener);
        }
      }
    }
  }
  function makeContext(property, change) {
    let context = /* @__PURE__ */ new Map();
    if (typeof property === "object") {
      for (let prop in property) {
        context.set(prop, property[prop]);
      }
    } else {
      context.set(property, change);
    }
    return context;
  }
  function addContext(listener, context) {
    if (!listener.context) {
      listener.context = context;
    } else {
      context.forEach((change, property) => {
        listener.context.set(property, change);
      });
    }
    listener.needsUpdate = true;
  }
  function clearContext(listener) {
    delete listener.context;
    delete listener.needsUpdate;
  }
  function notifyGet(self, property) {
    let currentCompute = computeStack[computeStack.length - 1];
    if (currentCompute) {
      setListeners(self, property, currentCompute);
    }
  }
  var listenersMap = /* @__PURE__ */ new WeakMap();
  var computeMap = /* @__PURE__ */ new WeakMap();
  function getListeners(self, property) {
    let listeners = listenersMap.get(self);
    return listeners ? Array.from(listeners.get(property) || []) : [];
  }
  function setListeners(self, property, compute) {
    if (!listenersMap.has(self)) {
      listenersMap.set(self, /* @__PURE__ */ new Map());
    }
    let listeners = listenersMap.get(self);
    if (!listeners.has(property)) {
      listeners.set(property, /* @__PURE__ */ new Set());
    }
    listeners.get(property).add(compute);
    if (!computeMap.has(compute)) {
      computeMap.set(compute, /* @__PURE__ */ new Map());
    }
    let connectedSignals = computeMap.get(compute);
    if (!connectedSignals.has(property)) {
      connectedSignals.set(property, /* @__PURE__ */ new Set());
    }
    connectedSignals.get(property).add(self);
  }
  function clearListeners(compute) {
    let connectedSignals = computeMap.get(compute);
    if (connectedSignals) {
      connectedSignals.forEach((property) => {
        property.forEach((s) => {
          let listeners = listenersMap.get(s);
          if (listeners.has(property)) {
            listeners.get(property).delete(compute);
          }
        });
      });
    }
  }
  var computeStack = [];
  var effectStack = [];
  var signalStack = [];
  function throttledEffect(fn, throttleTime) {
    if (effectStack.findIndex((f) => fn == f) !== -1) {
      throw new Error("Recursive update() call", { cause: fn });
    }
    effectStack.push(fn);
    let connectedSignal = signals.get(fn);
    if (!connectedSignal) {
      connectedSignal = signal({
        current: null
      });
      signals.set(fn, connectedSignal);
    }
    let throttled = false;
    let hasChange = true;
    const computeEffect = function computeEffect2() {
      if (signalStack.findIndex((s) => s == connectedSignal) !== -1) {
        throw new Error("Cyclical dependency in update() call", { cause: fn });
      }
      if (throttled && throttled > Date.now()) {
        hasChange = true;
        return;
      }
      clearListeners(computeEffect2);
      computeStack.push(computeEffect2);
      signalStack.push(connectedSignal);
      let result;
      try {
        result = fn(computeEffect2, computeStack, signalStack);
      } finally {
        hasChange = false;
        computeStack.pop();
        signalStack.pop();
        if (result instanceof Promise) {
          result.then((result2) => {
            connectedSignal.current = result2;
          });
        } else {
          connectedSignal.current = result;
        }
      }
      throttled = Date.now() + throttleTime;
      globalThis.setTimeout(() => {
        if (hasChange) {
          computeEffect2();
        }
      }, throttleTime);
    };
    computeEffect();
    return connectedSignal;
  }

  // src/bind.mjs
  var SimplyBind = class {
    constructor(options) {
      const defaultOptions = {
        container: document.body,
        attribute: "data-bind",
        transformers: [],
        defaultTransformers: [defaultTransformer]
      };
      if (!options?.root) {
        throw new Error("bind needs at least options.root set");
      }
      this.options = Object.assign({}, defaultOptions, options);
      const attribute = this.options.attribute;
      const render = (el) => {
        throttledEffect(() => {
          const context = {
            templates: el.querySelectorAll(":scope > template"),
            path: this.getBindingPath(el)
          };
          context.value = getValueByPath(this.options.root, context.path);
          context.element = el;
          runTransformers(context);
        }, 100);
      };
      const runTransformers = (context) => {
        let transformers = this.options.defaultTransformers || [];
        if (context.element.dataset.transform) {
          context.element.dataset.transform.split(" ").filter(Boolean).forEach((t) => {
            if (this.options.transformers[t]) {
              transformers.push(this.options.transformers[t]);
            } else {
              console.warn("No transformer with name " + t + " configured", { cause: context.element });
            }
          });
        }
        let next;
        for (let transformer of transformers) {
          next = /* @__PURE__ */ ((next2, transformer2) => {
            return (context2) => {
              return transformer2.call(this, context2, next2);
            };
          })(next, transformer);
        }
        next(context);
      };
      const applyBindings = (bindings2) => {
        for (let bindingEl of bindings2) {
          render(bindingEl);
        }
      };
      const updateBindings = (changes) => {
        for (const change of changes) {
          if (change.type == "childList" && change.addedNodes) {
            for (let node of change.addedNodes) {
              if (node instanceof HTMLElement) {
                let bindings2 = Array.from(node.querySelectorAll(`[${attribute}]`));
                if (node.matches(`[${attribute}]`)) {
                  bindings2.unshift(node);
                }
                if (bindings2.length) {
                  applyBindings(bindings2);
                }
              }
            }
          }
        }
      };
      const observer = new MutationObserver((changes) => {
        updateBindings(changes);
      });
      observer.observe(options.container, {
        subtree: true,
        childList: true
      });
      const bindings = this.options.container.querySelectorAll("[" + this.options.attribute + "]:not(template)");
      if (bindings.length) {
        applyBindings(bindings);
      }
    }
    /**
     * Finds the first matching template and creates a new DocumentFragment
     * with the correct data bind attributes in it (prepends the current path)
     */
    applyTemplate(path, templates, list, index) {
      let template = this.findTemplate(templates, list[index]);
      if (!template) {
        let result = new DocumentFragment();
        result.innerHTML = "<!-- no matching template -->";
        return result;
      }
      let clone = template.content.cloneNode(true);
      if (!clone.children?.length) {
        throw new Error("template must contain a single html element", { cause: template });
      }
      if (clone.children.length > 1) {
        throw new Error("template must contain a single root node", { cause: template });
      }
      const bindings = clone.querySelectorAll("[" + this.options.attribute + "]");
      const attribute = this.options.attribute;
      for (let binding of bindings) {
        const bind2 = binding.getAttribute(attribute);
        if (bind2.substring(0, "#root.".length) == "#root.") {
          binding.setAttribute(attribute, bind2.substring("#root.".length));
        } else if (bind2 == "#value") {
          binding.setAttribute(attribute, path + "." + index);
        } else {
          binding.setAttribute(attribute, path + "." + index + "." + bind2);
        }
      }
      clone.children[0].setAttribute(attribute + "-key", index);
      clone.children[0].$bindTemplate = template;
      return clone;
    }
    getBindingPath(el) {
      return el.getAttribute(this.options.attribute);
    }
    /**
     * Finds the first template from an array of templates that
     * matches the given value. 
     */
    findTemplate(templates, value) {
      const templateMatches = (t) => {
        let path = this.getBindingPath(t);
        if (!path) {
          return t;
        }
        let currentItem;
        if (path.substr(0, 6) == "#root.") {
          currentItem = getValueByPath(this.options.root, path);
        } else {
          currentItem = getValueByPath(value, path);
        }
        const strItem = "" + currentItem;
        let matches = t.getAttribute(this.options.attribute + "-matches");
        if (matches) {
          if (matches === "#empty" && !currentItem) {
            return t;
          } else if (matches === "#notempty" && currentItem) {
            return t;
          }
          if (strItem.match(matches)) {
            return t;
          }
        }
        if (!matches) {
          if (currentItem) {
            return t;
          }
        }
      };
      let template = Array.from(templates).find(templateMatches);
      let rel = template?.getAttribute("rel");
      if (rel) {
        let replacement = document.querySelector("template#" + rel);
        if (!replacement) {
          throw new Error("Could not find template with id " + rel);
        }
        template = replacement;
      }
      return template;
    }
  };
  function bind(options) {
    return new SimplyBind(options);
  }
  function matchValue(a, b) {
    if (a == "#empty" && !b) {
      return true;
    }
    if (b == "#empty" && !a) {
      return true;
    }
    if ("" + a == "" + b) {
      return true;
    }
    return false;
  }
  function getValueByPath(root, path) {
    let parts = path.split(".");
    let curr = root;
    let part, prevPart;
    while (parts.length && curr) {
      part = parts.shift();
      if (part == "#key") {
        return prevPart;
      } else if (part == "#value") {
        return curr;
      } else if (part == "#root") {
        curr = root;
      } else {
        part = decodeURIComponent(part);
        curr = curr[part];
        prevPart = part;
      }
    }
    return curr;
  }
  function defaultTransformer(context) {
    const el = context.element;
    const templates = context.templates;
    const templatesCount = templates.length;
    const path = context.path;
    const value = context.value;
    const attribute = this.options.attribute;
    if (Array.isArray(value) && templates?.length) {
      transformArrayByTemplates.call(this, context);
    } else if (value && typeof value == "object" && templates?.length) {
      transformObjectByTemplates.call(this, context);
    } else if (el.tagName == "INPUT") {
      transformInput.call(this, context);
    } else if (el.tagName == "BUTTON") {
      transformButton.call(this, context);
    } else if (el.tagName == "SELECT") {
      transformSelect.call(this, context);
    } else if (el.tagName == "A") {
      transformAnchor.call(this, context);
    } else {
      transformElement.call(this, context);
    }
    return context;
  }
  function transformArrayByTemplates(context) {
    const el = context.element;
    const templates = context.templates;
    const templatesCount = templates.length;
    const path = context.path;
    const value = context.value;
    const attribute = this.options.attribute;
    let items = el.querySelectorAll(":scope > [" + attribute + "-key]");
    let lastKey = 0;
    let skipped = 0;
    for (let item of items) {
      let currentKey = parseInt(item.getAttribute(attribute + "-key"));
      if (currentKey > lastKey) {
        el.insertBefore(this.applyTemplate(path, templates, value, lastKey), item);
      } else if (currentKey < lastKey) {
        item.remove();
      } else {
        let bindings = Array.from(item.querySelectorAll(`[${attribute}]`));
        if (item.matches(`[${attribute}]`)) {
          bindings.unshift(item);
        }
        let needsReplacement = bindings.find((b) => {
          let databind = b.getAttribute(attribute);
          return databind.substr(0, 5) !== "#root" && databind.substr(0, path.length) !== path;
        });
        if (!needsReplacement) {
          if (item.$bindTemplate) {
            let newTemplate = this.findTemplate(templates, value[lastKey]);
            if (newTemplate != item.$bindTemplate) {
              needsReplacement = true;
              if (!newTemplate) {
                skipped++;
              }
            }
          }
        }
        if (needsReplacement) {
          el.replaceChild(this.applyTemplate(path, templates, value, lastKey), item);
        }
      }
      lastKey++;
      if (lastKey >= value.length) {
        break;
      }
    }
    items = el.querySelectorAll(":scope > [" + attribute + "-key]");
    let length = items.length + skipped;
    if (length > value.length) {
      while (length > value.length) {
        let child = el.querySelectorAll(":scope > :not(template)")?.[length - 1];
        child?.remove();
        length--;
      }
    } else if (length < value.length) {
      while (length < value.length) {
        el.appendChild(this.applyTemplate(path, templates, value, length));
        length++;
      }
    }
  }
  function transformObjectByTemplates(context) {
    const el = context.element;
    const templates = context.templates;
    const templatesCount = templates.length;
    const path = context.path;
    const value = context.value;
    const attribute = this.options.attribute;
    let list = Object.entries(value);
    let items = el.querySelectorAll(":scope > [" + attribute + "-key]");
    let current = 0;
    let skipped = 0;
    for (let item of items) {
      if (current >= list.length) {
        break;
      }
      let key = list[current][0];
      current++;
      let keypath = path + "." + key;
      let needsReplacement;
      const databind = item.getAttribute(attribute);
      if (databind && databind.substr(0, keypath.length) != keypath) {
        needsReplacement = true;
      } else {
        let bindings = Array.from(item.querySelectorAll(`[${attribute}]`));
        needsReplacement = bindings.find((b) => {
          const db = b.getAttribute(attribute);
          return db.substr(0, 5) !== "#root" && db.substr(0, keypath.length) !== keypath;
        });
        if (!needsReplacement) {
          if (item.$bindTemplate) {
            let newTemplate = this.findTemplate(templates, value[key]);
            if (newTemplate != item.$bindTemplate) {
              needsReplacement = true;
              if (!newTemplate) {
                skipped++;
              }
            }
          }
        }
      }
      if (needsReplacement) {
        let clone = this.applyTemplate(path, templates, value, key);
        el.replaceChild(clone, item);
      }
    }
    items = el.querySelectorAll(":scope > [" + attribute + "-key]");
    let length = items.length + skipped;
    if (length > list.length) {
      while (length > list.length) {
        let child = el.querySelectorAll(":scope > :not(template)")?.[length - 1];
        child?.remove();
        length--;
      }
    } else if (length < list.length) {
      while (length < list.length) {
        let key = list[length][0];
        el.appendChild(this.applyTemplate(path, templates, value, key));
        length++;
      }
    }
  }
  function transformInput(context) {
    const el = context.element;
    const value = context.value;
    if (el.type == "checkbox" || el.type == "radio") {
      if (matchValue(el.value, value)) {
        el.checked = true;
      } else {
        el.checked = false;
      }
    } else if (!matchValue(el.value, value)) {
      el.value = "" + value;
    }
  }
  function transformButton(context) {
    const el = context.element;
    const value = context.value;
    if (!matchValue(el.value, value)) {
      el.value = "" + value;
    }
  }
  function transformSelect(context) {
    const el = context.element;
    const value = context.value;
    if (el.multiple) {
      if (Array.isArray(value)) {
        for (let option of el.options) {
          if (value.indexOf(option.value) === false) {
            option.selected = false;
          } else {
            option.selected = true;
          }
        }
      }
    } else {
      let option = el.options.find((o) => matchValue(o.value, value));
      if (option) {
        option.selected = true;
      }
    }
  }
  function transformAnchor(context) {
    const el = context.element;
    const value = context.value;
    if (value?.innerHTML && !matchValue(el.innerHTML, value.innerHTML)) {
      el.innerHTML = "" + value.innerHTML;
    }
    if (value?.href && !matchValue(el.href, value.href)) {
      el.href = "" + value.href;
    }
  }
  function transformElement(context) {
    const el = context.element;
    const value = context.value;
    if (!matchValue(el.innerHTML, value)) {
      el.innerHTML = "" + value;
    }
  }

  // src/app.mjs
  var SimplyApp = class {
    constructor(options = {}) {
      this.container = options.container || document.body;
      if (!options.state) {
        options.state = {};
      }
      this.state = signal(options.state);
      if (options.commands) {
        this.commands = commands({ app: this, container: this.container, commands: options.commands });
      }
      if (options.keys) {
        this.keys = keys({ app: this, keys: options.keys });
      }
      if (options.routes) {
        this.routes = routes({ app: this, routes: options.routes });
      }
      if (options.actions) {
        this.actions = actions({ app: this, actions: options.actions });
      }
      let bindOptions = { container: this.container, root: this.state };
      if (options.defaultTransformers) {
        bindOptions.defaultTransformers = options.defaultTransformers;
      }
      if (options.transformers) {
        bindOptions.transformers = options.transformers;
      }
      this.bind = bind(bindOptions);
    }
  };
  function app(options = {}) {
    return new SimplyApp(options);
  }
})();
