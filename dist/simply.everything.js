(() => {
  // src/activate.mjs
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
        callback.call(node);
      }
    }
  }
  function handleChanges(changes) {
    let activateNodes = [];
    for (let change of changes) {
      if (change.type == "childList") {
        for (let node of change.addedNodes) {
          if (node.querySelectorAll) {
            var toActivate = Array.from(node.querySelectorAll("[data-simply-activate]"));
            if (node.matches("[data-simply-activate]")) {
              toActivate.push(node);
            }
            activateNodes = activateNodes.concat(toActivate);
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
      const actionHandler = {
        get(target, property) {
          if (!target[property]) {
            return void 0;
          }
          if (target.catch) {
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
  var functionHandler = {
    apply(target, thisArg, argumentsList) {
      try {
        const result = target(...argumentsList);
        if (result instanceof Promise) {
          return result.catch((err) => {
            return thisArg.catch(err);
          });
        }
        return result;
      } catch (err) {
        return thisArg.catch(err);
      }
    }
  };

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
      this.root = options.root || "/";
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
        if (this.match(document.location.pathname + document.location.hash)) {
          return true;
        } else {
          return this.match(document.location.pathname);
        }
      }
      path = getPath(path);
      for (let route of this.routeInfo) {
        matches = route.match.exec(path);
        if (this.addMissingSlash && !matches?.length) {
          if (path && path[path.length - 1] != "/") {
            matches = route.match.exec(path + "/");
            if (matches) {
              path += "/";
              history.replaceState({}, "", getURL(path, this.root));
            }
          }
        }
        if (matches && matches.length) {
          let params = {};
          route.params.forEach((key, i2) => {
            if (key == "*") {
              key = "remainder";
            }
            params[key] = matches[i2 + 1];
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
          let path = getPath(link.pathname + link.hash, this.root);
          if (!this.has(path)) {
            path = getPath(link.pathname, this.root);
          }
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
      history.pushState({}, "", getURL(path, this.root));
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
  function getRegexpFromRoute(route, exact = false) {
    if (exact) {
      return new RegExp("^" + route.replace(/:\w+/g, "([^/]+)").replace(/:\*/, "(.*)") + "(\\?|$)");
    }
    return new RegExp("^" + route.replace(/:\w+/g, "([^/]+)").replace(/:\*/, "(.*)"));
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
        let keyboards = [];
        let keyboardElement = event.target.closest("[data-simply-keyboard]");
        while (keyboardElement) {
          keyboards.push(keyboardElement.dataset.simplyKeyboard);
          keyboardElement = keyboardElement.parentNode.closest("[data-simply-keyboard]");
        }
        keyboards.push("");
        let keyboard, subkeyboard;
        let separators = ["+", "-"];
        for (i in keyboards) {
          keyboard = keyboards[i];
          if (keyboard == "") {
            subkeyboard = "default";
          } else {
            subkeyboard = keyboard;
            keyboard += ".";
          }
          for (let separator of separators) {
            let keyString = keyCombination.join(separator);
            if (this[subkeyboard] && typeof this[subkeyboard][keyString] == "function") {
              let _continue = this[subkeyboard][keyString].call(options.app, e);
              if (!_continue) {
                e.preventDefault();
                return;
              }
            }
            if (typeof this[subkeyboard + keyString] == "function") {
              let _continue = this[subkeyboard + keyString].call(options.app, e);
              if (!_continue) {
                e.preventDefault();
                return;
              }
            }
            if (this[selectedKeyboard] && this[selectedKeyboard][keyString]) {
              let targets = options.app.container.querySelectorAll('[data-simply-accesskey="' + keyboard + keyString + '"]');
              if (targets.length) {
                targets.forEach((t) => t.click());
                e.preventDefault();
              }
            }
          }
        }
      };
      options.app.container.addEventListener("keydown", keyHandler);
    }
  };
  function keys(options = {}, optionsCompat) {
    if (optionsCompat) {
      let app2 = options;
      options = optionsCompat;
      options.app = options;
    }
    return new SimplyKey(options);
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

  // src/app.mjs
  var SimplyApp = class {
    constructor(options = {}) {
      this.container = options.container || document.body;
      for (let key in options) {
        switch (key) {
          case "commands":
            this.commands = commands({ app: this, container: this.container, commands: options.commands });
            break;
          case "keys":
          case "keyboard":
            this.keys = keys({ app: this, keys: options.keys });
            break;
          case "routes":
            this.routes = routes({ app: this, routes: options.routes });
            this.routes.handleEvents();
            globalThis.setTimeout(() => {
              this.routes.match(globalThis.location?.pathname + globalThis.location?.hash);
            });
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
          default:
            this[key] = options[key];
            break;
        }
      }
    }
    get app() {
      return this;
    }
  };
  function app(options = {}) {
    return new SimplyApp(options);
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
      return () => myScript.src;
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
    html: (html, link) => {
      let fragment = globalThis.document.createRange().createContextualFragment(html);
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
      const html = await response.text();
      include.html(html, link);
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

  // src/render.mjs
  var SimplyRender = class extends HTMLElement {
    constructor() {
      super();
      let templateId = this.getAttribute("rel");
      let template = document.getElementById(templateId);
      if (template) {
        let content = template.content.cloneNode(true);
        for (const node of content.childNodes) {
          const clone = node.cloneNode(true);
          if (clone.nodeType == document.ELEMENT_NODE) {
            clone.querySelectorAll("template").forEach(function(t) {
              t.setAttribute("simply-render", "");
            });
          }
          this.parentNode.insertBefore(clone, this);
        }
        this.parentNode.removeChild(this);
      }
    }
  };
  if (!customElements.get("simply-render")) {
    customElements.define("simply-render", SimplyRender);
  }

  // src/everything.mjs
  var simply = {
    activate,
    action: actions,
    app,
    command: commands,
    include,
    key: keys,
    route: routes,
    view
  };
  globalThis.simply = simply;
  var everything_default = simply;
})();
