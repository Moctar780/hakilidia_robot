/**
 * Pont commun BlocklyDuino pour iframe web et WebView React Native.
 */
'use strict';

(function () {
  var SOURCE = 'blocklyduino-workspace';

  var transport = {
    send: function (payload) {
      var message = Object.assign({ source: SOURCE }, payload);
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify(message));
      } else if (window.parent) {
        window.parent.postMessage(message, '*');
      }
    },
  };

  function getParam(name, fallback) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name) || fallback;
  }

  function reportError(error) {
    var message = error && error.stack ? error.stack : String(error);
    transport.send({ type: 'error', message: message });
  }

  function getTheme(themeName) {
    if (!window.Blockly) {
      return undefined;
    }
    var themes = Blockly.Themes || {};
    if (themeName === 'dark' && themes.Dark) return themes.Dark;
    if (themeName === 'modern' && themes.Modern) return themes.Modern;
    if (themeName === 'zelos' && themes.Zelos) return themes.Zelos;
    if (themeName === 'blackWhite' && themes.blackWhite) return themes.blackWhite;
    return themes.Classic;
  }

  var BlocklyDuinoBridge = {
    workspace: null,
    state: {
      boardId: getParam('board', 'arduino_uno'),
      language: getParam('lang', 'fr'),
      renderer: getParam('renderer', 'geras'),
      theme: getParam('theme', 'classic'),
      disabledCategories: {},
    },

    applySize: function (width, height) {
      var div = document.getElementById('blocklyDiv');
      if (!div) return;
      var w = width || window.innerWidth || document.documentElement.clientWidth || 300;
      var h = height || window.innerHeight || document.documentElement.clientHeight || 300;
      div.style.width = w + 'px';
      div.style.height = h + 'px';
      if (this.workspace) {
        Blockly.svgResize(this.workspace);
      }
    },

    renderCode: function () {
      if (!this.workspace || !Blockly.Arduino) return;
      try {
        transport.send({ type: 'code', code: Blockly.Arduino.workspaceToCode(this.workspace) });
        var dom = Blockly.Xml.workspaceToDom(this.workspace);
        transport.send({ type: 'xmlSnapshot', xml: Blockly.Xml.domToText(dom) });
      } catch (e) {
        reportError(e);
      }
    },

    initProfile: function () {
      if (typeof profile !== 'undefined') {
        var selected = profile[this.state.boardId] && profile[this.state.boardId][0];
        profile.default = selected || (profile.none && profile.none[0]) || profile.default;
      }
    },

    customToolboxes: function () {
      return [window.BLOCKLY_AI_TOOLBOX, window.BLOCKLY_ROBOT_TOOLBOX].filter(Boolean);
    },

    extendToolbox: function (toolbox) {
      if (!toolbox || !toolbox.contents) {
        return toolbox;
      }
      var customToolboxes = this.customToolboxes();
      for (var i = 0; i < customToolboxes.length; i++) {
        var customToolbox = customToolboxes[i];
        if (this.state.disabledCategories[customToolbox.toolboxitemid]) {
          continue;
        }
        var exists = toolbox.contents.some(function (item) {
          return item.toolboxitemid === customToolbox.toolboxitemid;
        });
        if (!exists) {
          toolbox.contents.push(customToolbox);
        }
      }
      return toolbox;
    },

    buildToolbox: function () {
      if (typeof Code !== 'undefined' && typeof Code.buildToolbox === 'function') {
        try {
          return this.extendToolbox(Code.buildToolbox());
        } catch (e) {
          reportError(e);
        }
      }
      if (typeof jsonToolbox === 'undefined') {
        return { kind: 'categoryToolbox', contents: [] };
      }
      var disabled = this.state.disabledCategories;
      return this.extendToolbox({
        kind: 'categoryToolbox',
        contents: jsonToolbox.contents.filter(function (item) {
          return !item.toolboxitemid || !disabled[item.toolboxitemid];
        }),
      });
    },

    injectWorkspace: function (preserveXml) {
      var xmlText = preserveXml || null;
      if (!xmlText && this.workspace) {
        var dom = Blockly.Xml.workspaceToDom(this.workspace);
        xmlText = Blockly.Xml.domToText(dom);
      }
      if (this.workspace) {
        this.workspace.dispose();
      }
      this.initProfile();
      this.workspace = Blockly.inject('blocklyDiv', {
        comments: true,
        collapse: true,
        disable: true,
        grid: { spacing: 25, length: 0, colour: '#ccc', snap: true },
        horizontalLayout: false,
        maxBlocks: Infinity,
        media: './@blockly/media/',
        sounds: false,
        oneBasedIndex: true,
        readOnly: false,
        rtl: false,
        move: { scrollbars: true, drag: true, wheel: false },
        toolbox: this.buildToolbox(),
        toolboxPosition: 'start',
        renderer: this.state.renderer,
        theme: getTheme(this.state.theme),
        zoom: {
          controls: true,
          pinch: true,
          wheel: false,
          startScale: 1.0,
          maxScale: 4,
          minScale: 0.25,
          scaleSpeed: 1.1,
        },
      });

      if (typeof Code !== 'undefined') {
        Code.workspace = this.workspace;
      }
      this.registerCallbacks();
      this.workspace.addChangeListener(this.renderCode.bind(this));
      if (xmlText) {
        Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(xmlText), this.workspace);
      }
      this.applySize();
      this.renderCode();
    },

    registerCallbacks: function () {
      var registrations = [
        ['registerButtonCallback', 'createVarBtnInt', 'createVarBtnIntCallBack'],
        ['registerButtonCallback', 'createVarBtnFloat', 'createVarBtnFloatCallBack'],
        ['registerButtonCallback', 'createVarBtnString', 'createVarBtnStringCallBack'],
        ['registerButtonCallback', 'createVarBtnBoolean', 'createVarBtnBooleanCallBack'],
        ['registerToolboxCategoryCallback', 'VARIABLE_TYPED_NUM', 'numVariablesCallBack'],
        ['registerToolboxCategoryCallback', 'VARIABLE_TYPED_TEXT', 'textVariablesCallBack'],
        ['registerToolboxCategoryCallback', 'VARIABLE_TYPED_BOOLEAN', 'booleanVariablesCallBack'],
      ];
      for (var i = 0; i < registrations.length; i++) {
        var method = registrations[i][0];
        var name = registrations[i][1];
        var callback = window[registrations[i][2]];
        if (typeof callback === 'function') {
          this.workspace[method](name, callback);
        }
      }
    },

    initLanguage: function () {
      if (typeof Code !== 'undefined') {
        Code.LANG = this.state.language;
      }
      if (typeof MSG !== 'undefined') {
        for (var messageKey in MSG) {
          if (messageKey.indexOf('cat') === 0) {
            Blockly.Msg[messageKey.toUpperCase()] = MSG[messageKey];
          }
        }
      }
    },

    init: function () {
      try {
        this.initLanguage();
        this.applySize();
        this.injectWorkspace();
        window.addEventListener('resize', this.applySize.bind(this));
        if (window.ResizeObserver) {
          new ResizeObserver(this.applySize.bind(this)).observe(document.body);
        }
        setTimeout(this.applySize.bind(this), 50);
        setTimeout(this.applySize.bind(this), 300);
        transport.send({ type: 'ready' });
      } catch (e) {
        reportError(e);
      }
    },

    handleCommand: function (data) {
      try {
        switch (data.command) {
          case 'undo':
            this.workspace && this.workspace.undo(false);
            break;
          case 'redo':
            this.workspace && this.workspace.undo(true);
            break;
          case 'clear':
          case 'newProject':
            this.workspace && this.workspace.clear();
            break;
          case 'loadXml':
            if (data.xml && this.workspace) {
              this.workspace.clear();
              Blockly.Xml.domToWorkspace(Blockly.Xml.textToDom(data.xml), this.workspace);
            }
            break;
          case 'getXml':
            if (this.workspace) {
              var dom = Blockly.Xml.workspaceToDom(this.workspace);
              transport.send({ type: 'xml', xml: Blockly.Xml.domToText(dom) });
            }
            break;
          case 'resize':
            this.applySize(data.width, data.height);
            break;
          case 'setBoard':
            this.state.boardId = data.boardId;
            this.injectWorkspace();
            transport.send({ type: 'boardChanged', boardId: data.boardId });
            break;
          case 'setLanguage':
            this.state.language = data.language;
            this.initLanguage();
            break;
          case 'setTheme':
            this.state.theme = data.theme;
            if (this.workspace && this.workspace.setTheme) {
              this.workspace.setTheme(getTheme(data.theme));
            }
            break;
          case 'setRenderer':
            this.state.renderer = data.renderer;
            this.injectWorkspace();
            break;
          case 'toggleCategory':
            this.state.disabledCategories[data.categoryId] = !data.enabled;
            if (this.workspace && this.workspace.updateToolbox) {
              this.workspace.updateToolbox(this.buildToolbox());
            }
            break;
          case 'setRenderingConstant':
            document.documentElement.style.fontSize = data.value + 'px';
            break;
          case 'setAccessibility':
            if (typeof toggleAccessibilityMode === 'function') {
              toggleAccessibilityMode(data.enabled);
            }
            break;
          default:
            break;
        }
        this.renderCode();
      } catch (e) {
        reportError(e);
      }
    },
  };

  function onMessage(event) {
    var data = event.data;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        return;
      }
    }
    if (!data || (data.target && data.target !== SOURCE)) {
      return;
    }
    BlocklyDuinoBridge.handleCommand(data);
  }

  window.BlocklyDuinoBridge = BlocklyDuinoBridge;
  window.handleNativeCommand = function (json) {
    try {
      BlocklyDuinoBridge.handleCommand(JSON.parse(json));
    } catch (e) {
      reportError(e);
    }
  };
  window.onerror = function (message, source, lineno, colno, error) {
    reportError(error || message);
  };
  document.addEventListener('message', onMessage);
  window.addEventListener('message', onMessage);

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(BlocklyDuinoBridge.init.bind(BlocklyDuinoBridge), 0);
  } else {
    window.addEventListener('load', BlocklyDuinoBridge.init.bind(BlocklyDuinoBridge));
  }
})();
