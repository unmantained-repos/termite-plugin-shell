'use strict';

const ShellComponent = require('./shell-component');
const themes = require('iterm-colors/bundle.json');

module.exports = function init(app) {
  app.config.on('all-preferences-loaded', () => {
    const pref = app.packages.shell.preferences;
    pref['user-css'] = (pref['user-css'] || '').replace(/~/g, app.config.configFolder);
  });

  app.on('packages-init-done', () => {
    window.termite.commands.execute('new-tab');
  });

  const pkg = {
    initializeTerminal(t) {
      if (!this._theme) {
        this._theme = this.preferences.theme;
      }
      if (this._theme) {
        const theme = themes[this._theme];
        if (theme.background) {
          t.prefs_.set('background-color', theme.background);
        }

        if (theme.foreground) {
          t.prefs_.set('foreground-color', theme.foreground);
        }

        if (theme.cursor_text) {
          t.prefs_.set('cursor-color', theme.cursor_text);
        }

        if (theme.palette) {
          t.prefs_.set('color-palette-overrides', theme.palette);
        }
      }

      delete this.preferences.theme;

      Object.keys(this.preferences).forEach(k => {
        t.prefs_.set(k, this.preferences[k]);
      });
    },

    get currentHTerm() {
      const current = app.tabs.current();
      if (!current) {
        return null;
      }
      return current.component.hterm || null;
    },

    get currentComponent() {
      const current = app.tabs.current();
      if (!current) {
        return null;
      }
      return current.component.hterm ? current.component : null;
    },

    get cursorRow() {
      const shell = this.currentHTerm;
      if (!shell) {
        return null;
      }
      return shell.screen_.cursorPosition.row;
    },

    get cursorCol() {
      const shell = this.currentHTerm;
      if (!shell) {
        return null;
      }
      return shell.screen_.cursorPosition.column;
    },

    get cursorRowText() {
      const shell = this.currentHTerm;
      if (!shell) {
        return null;
      }
      return shell.screen_.cursorRowNode_.textContent;
    },

    name: 'shell',
    path: __dirname
  };

  app.commands.register('new-tab', () => {
    const component = new ShellComponent(app, pkg);
    const tab = app.tabs.add(component);
    component.on('process-closed', () => {
      app.tabs.activateFirstTab();
      tab.close();
    });
  });

  app.commands.register('prev-word', () => {
    const component = pkg.currentComponent;
    const col = pkg.cursorCol;
    const text = pkg.cursorRowText;

    if (!text) {
      return;
    }

    let i = col - 1;
    while (i && text[i].match(/\s/)) {
      component.sendKey(0x25, 'keydown');
      i--;
    }

    while (i && !text[i].match(/\s/)) {
      component.sendKey(0x25, 'keydown');
      i--;
    }
  });

  app.commands.register('next-word', () => {
    const component = pkg.currentComponent;
    const col = pkg.cursorCol;
    const text = pkg.cursorRowText;

    if (!text) {
      return;
    }

    let i = col - 1;
    while (i && text[i].match(/\s/)) {
      component.sendKey(0x27, 'keydown');
      i++;
    }

    while (i && !text[i].match(/\s/)) {
      component.sendKey(0x27, 'keydown');
      i++;
    }
  });

  app.commands.register('start-line', () => {
    const component = pkg.currentComponent;
    const col = pkg.cursorCol;

    if (!col) {
      return;
    }

    let i = col - 1;
    while (i--) {
      component.sendKey(0x25, 'keydown');
    }
  });

  app.commands.register('end-line', () => {
    const component = pkg.currentComponent;
    const col = pkg.cursorCol;
    const text = pkg.cursorRowText;

    if (!text) {
      return;
    }

    let i = text.length - col + 1;
    while (i--) {
      component.sendKey(0x27, 'keydown');
    }
  });

  app.commands.register('delete-line', () => {
    const component = pkg.currentComponent;
    const col = pkg.cursorCol;
    const text = pkg.cursorRowText;

    if (!text) {
      return;
    }

    let i = text.length - col + 1;
    while (i--) {
      component.sendKey(0x27, 'keydown');
    }

    i = text.length;

    while (i--) {
      component.sendKey(0x08, 'keydown');
    }
  });

  require('./patch-hterm');

  return pkg;
};
