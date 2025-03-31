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
  function actions(options) {
    if (options.app) {
      const actionHandler = {
        get: (target, property) => {
          return target[property].bind(options.app);
        }
      };
      return new Proxy(options.actions, actionHandler);
    } else {
      return options;
    }
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
      Object.assign(this, options.keys);
      const keyHandler = (e) => {
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
        if (this[selectedKeyboard] && this[selectedKeyboard][key]) {
          let keyboard = this[selectedKeyboard];
          keyboard[key].call(options.app, e);
        }
      };
      options.app.container.addEventListener("keydown", keyHandler);
    }
  };
  function keys(options = {}) {
    return new SimplyKeys(options);
  }

  // src/state.mjs
  var iterate = Symbol("iterate");
  if (!Symbol.xRay) {
    Symbol.xRay = Symbol("xRay");
  }
  var signalHandler = {
    get: (target, property, receiver) => {
      if (property === Symbol.xRay) {
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
        } else if (target instanceof HTMLElement || target instanceof Number || target instanceof String || target instanceof Boolean) {
          return value.bind(target);
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
      value = value?.[Symbol.xRay] || value;
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
  var effectMap = /* @__PURE__ */ new WeakMap();
  var signalStack = [];
  function destroy(connectedSignal) {
    const computeEffect = effectMap.get(connectedSignal)?.deref();
    if (!computeEffect) {
      return;
    }
    clearListeners(computeEffect);
    let fn = computeEffect.fn;
    signals.remove(fn);
    effectMap.delete(connectedSignal);
  }
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
      this.bindings = /* @__PURE__ */ new Map();
      const defaultOptions = {
        container: document.body,
        attribute: "data-bind",
        transformers: [],
        defaultTransformers: {
          field: [defaultFieldTransformer],
          list: [defaultListTransformer],
          map: [defaultMapTransformer]
        }
      };
      if (!options?.root) {
        throw new Error("bind needs at least options.root set");
      }
      this.options = Object.assign({}, defaultOptions, options);
      const attribute = this.options.attribute;
      const bindAttributes = [attribute + "-field", attribute + "-list", attribute + "-map"];
      const bindSelector = `[${attribute}-field],[${attribute}-list],[${attribute}-map]`;
      const getBindingAttribute = (el) => {
        const foundAttribute = bindAttributes.find((attr) => el.hasAttribute(attr));
        if (!foundAttribute) {
          console.error("No matching attribute found", el);
        }
        return foundAttribute;
      };
      const render = (el) => {
        this.bindings.set(el, throttledEffect(() => {
          const context = {
            templates: el.querySelectorAll(":scope > template"),
            attribute: getBindingAttribute(el)
          };
          context.path = this.getBindingPath(el);
          context.value = getValueByPath(this.options.root, context.path);
          context.element = el;
          runTransformers(context);
        }, 100));
      };
      const runTransformers = (context) => {
        let transformers;
        switch (context.attribute) {
          case this.options.attribute + "-field":
            transformers = this.options.defaultTransformers.field || [];
            break;
          case this.options.attribute + "-list":
            transformers = this.options.defaultTransformers.list || [];
            break;
          case this.options.attribute + "-map":
            transformers = this.options.defaultTransformers.map || [];
            break;
        }
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
        const selector = `[${attribute}-field],[${attribute}-list],[${attribute}-map]`;
        for (const change of changes) {
          if (change.type == "childList" && change.addedNodes) {
            for (let node of change.addedNodes) {
              if (node instanceof HTMLElement) {
                let bindings2 = Array.from(node.querySelectorAll(selector));
                if (node.matches(selector)) {
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
      this.observer = new MutationObserver((changes) => {
        updateBindings(changes);
      });
      this.observer.observe(options.container, {
        subtree: true,
        childList: true
      });
      const bindings = this.options.container.querySelectorAll(
        "[" + this.options.attribute + "-field],[" + this.options.attribute + "-list],[" + this.options.attribute + "-map]"
      );
      if (bindings.length) {
        applyBindings(bindings);
      }
    }
    /**
     * Finds the first matching template and creates a new DocumentFragment
     * with the correct data bind attributes in it (prepends the current path)
     */
    applyTemplate(context) {
      const path = context.path;
      const templates = context.templates;
      const list = context.list;
      const index = context.index;
      const parent = context.parent;
      const value = list ? list[index] : context.value;
      let template = this.findTemplate(templates, value);
      if (!template) {
        let result = new DocumentFragment();
        result.innerHTML = "<!-- no matching template -->";
        return result;
      }
      let clone = template.content.cloneNode(true);
      if (!clone.children?.length) {
        return clone;
      }
      if (clone.children.length > 1) {
        throw new Error("template must contain a single root node", { cause: template });
      }
      const attribute = this.options.attribute;
      const attributes = [attribute + "-field", attribute + "-list", attribute + "-map"];
      const bindings = clone.querySelectorAll(`[${attribute}-field],[${attribute}-list],[${attribute}-map]`);
      for (let binding of bindings) {
        const attr = attributes.find((attr2) => binding.hasAttribute(attr2));
        const bind2 = binding.getAttribute(attr);
        if (bind2.substring(0, ":root.".length) == ":root.") {
          binding.setAttribute(attr, bind2.substring(":root.".length));
        } else if (bind2 == ":value" && index != null) {
          binding.setAttribute(attr, path + "." + index);
        } else if (index != null) {
          binding.setAttribute(attr, path + "." + index + "." + bind2);
        } else {
          binding.setAttribute(attr, parent + "." + bind2);
        }
      }
      if (typeof index !== "undefined") {
        clone.children[0].setAttribute(attribute + "-key", index);
      }
      clone.children[0].$bindTemplate = template;
      return clone;
    }
    getBindingPath(el) {
      const attributes = [
        this.options.attribute + "-field",
        this.options.attribute + "-list",
        this.options.attribute + "-map"
      ];
      for (let attr of attributes) {
        if (el.hasAttribute(attr)) {
          return el.getAttribute(attr);
        }
      }
    }
    /**
     * Finds the first template from an array of templates that
     * matches the given value. 
     */
    findTemplate(templates, value) {
      const templateMatches = (t) => {
        let path = this.getBindingPath(t);
        let currentItem;
        if (path) {
          if (path.substr(0, 6) == ":root.") {
            currentItem = getValueByPath(this.options.root, path);
          } else {
            currentItem = getValueByPath(value, path);
          }
        } else {
          currentItem = value;
        }
        const strItem = "" + currentItem;
        let matches = t.getAttribute(this.options.attribute + "-match");
        if (matches) {
          if (matches === ":empty" && !currentItem) {
            return t;
          } else if (matches === ":notempty" && currentItem) {
            return t;
          }
          if (strItem.match(matches)) {
            return t;
          }
        }
        if (!matches && currentItem !== null && currentItem !== void 0) {
          return t;
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
    destroy() {
      this.bindings.forEach((binding) => {
        destroy(binding);
      });
      this.bindings = /* @__PURE__ */ new Map();
      this.observer.disconnect();
    }
  };
  function bind(options) {
    return new SimplyBind(options);
  }
  function matchValue(a, b) {
    if (a == ":empty" && !b) {
      return true;
    }
    if (b == ":empty" && !a) {
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
      if (part == ":key") {
        return prevPart;
      } else if (part == ":value") {
        return curr;
      } else if (part == ":root") {
        curr = root;
      } else {
        part = decodeURIComponent(part);
        curr = curr[part];
        prevPart = part;
      }
    }
    return curr;
  }
  function defaultFieldTransformer(context) {
    const el = context.element;
    const templates = context.templates;
    const templatesCount = templates.length;
    const path = context.path;
    const value = context.value;
    const attribute = this.options.attribute;
    if (templates?.length) {
      transformLiteralByTemplates.call(this, context);
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
  function defaultListTransformer(context) {
    const el = context.element;
    const templates = context.templates;
    const templatesCount = templates.length;
    const path = context.path;
    const value = context.value;
    const attribute = this.options.attribute;
    if (!Array.isArray(value)) {
      console.error("Value is not an array.", el, value);
    } else if (!templates?.length) {
      console.error("No templates found in", el);
    } else {
      transformArrayByTemplates.call(this, context);
    }
    return context;
  }
  function defaultMapTransformer(context) {
    const el = context.element;
    const templates = context.templates;
    const templatesCount = templates.length;
    const path = context.path;
    const value = context.value;
    const attribute = this.options.attribute;
    if (typeof value != "object") {
      console.error("Value is not an object.", el, value);
    } else if (!templates?.length) {
      console.error("No templates found in", el);
    } else {
      transformObjectByTemplates.call(this, context);
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
    context.list = value;
    for (let item2 of items) {
      let currentKey = parseInt(item2.getAttribute(attribute + "-key"));
      if (currentKey > lastKey) {
        context.index = lastKey;
        el.insertBefore(this.applyTemplate(context), item2);
      } else if (currentKey < lastKey) {
        item2.remove();
      } else {
        let bindings = Array.from(item2.querySelectorAll(`[${attribute}]`));
        if (item2.matches(`[${attribute}]`)) {
          bindings.unshift(item2);
        }
        let needsReplacement = bindings.find((b) => {
          let databind = b.getAttribute(attribute);
          return databind.substr(0, 5) !== ":root" && databind.substr(0, path.length) !== path;
        });
        if (!needsReplacement) {
          if (item2.$bindTemplate) {
            let newTemplate = this.findTemplate(templates, value[lastKey]);
            if (newTemplate != item2.$bindTemplate) {
              needsReplacement = true;
              if (!newTemplate) {
                skipped++;
              }
            }
          }
        }
        if (needsReplacement) {
          context.index = lastKey;
          el.replaceChild(this.applyTemplate(context), item2);
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
        context.index = length;
        el.appendChild(this.applyTemplate(context));
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
    context.list = value;
    let items = Array.from(el.querySelectorAll(":scope > [" + attribute + "-key]"));
    for (let key in context.list) {
      context.index = key;
      let item2 = items.shift();
      if (!item2) {
        let clone = this.applyTemplate(context);
        if (clone.firstElementChild) {
          el.appendChild(clone);
        }
        continue;
      }
      if (item2.getAttribute[attribute + "-key"] != key) {
        items.unshift(item2);
        let outOfOrderItem = el.querySelector(":scope > [" + attribute + '-key="' + key + '"]');
        if (!outOfOrderItem) {
          let clone = this.applyTemplate(context);
          if (clone.firstElementChild) {
            el.insertBefore(clone, item2);
          }
          continue;
        } else {
          el.insertBefore(outOfOrderItem, item2);
          item2 = outOfOrderItem;
          items = items.filter((i) => i != outOfOrderItem);
        }
      }
      let newTemplate = this.findTemplate(templates, value[key]);
      if (newTemplate != item2.$bindTemplate) {
        let clone = this.applyTemplate(context);
        el.replaceChild(clone, item2);
      }
    }
    while (items.length) {
      item = items.shift();
      item.remove();
    }
  }
  function getParentPath(el, attribute) {
    const parentEl = el.parentElement?.closest(`[${attribute}-list],[${attribute}-map]`);
    if (!parentEl) {
      return ":root";
    }
    if (parentEl.hasAttribute(`${attribute}-list`)) {
      return parentEl.getAttribute(`${attribute}-list`);
    }
    return parentEl.getAttribute(`${attribute}-map`);
  }
  function transformLiteralByTemplates(context) {
    const el = context.element;
    const templates = context.templates;
    const value = context.value;
    const attribute = this.options.attribute;
    const rendered = el.querySelector(":scope > :not(template)");
    const template = this.findTemplate(templates, value);
    context.parent = getParentPath(el, attribute);
    if (rendered) {
      if (template) {
        if (rendered?.$bindTemplate != template) {
          const clone = this.applyTemplate(context);
          el.replaceChild(clone, rendered);
        }
      } else {
        el.removeChild(rendered);
      }
    } else if (template) {
      const clone = this.applyTemplate(context);
      el.appendChild(clone);
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
      if (typeof value == "undefined" || value == null) {
        el.innerHTML = "";
      } else {
        el.innerHTML = "" + value;
      }
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
