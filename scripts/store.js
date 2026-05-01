const WIDGETS_MODULE_ID = "widgets";
const WIDGETS_STATE_SETTING = "widgetsState";
const WIDGETS_ENABLED_SETTING = "enabled";

const widgetsModuleState = globalThis.WidgetsModule ??= {
  MODULE_ID: WIDGETS_MODULE_ID,
  widgetTypes: new Map(),
  renderer: null,
  managerApp: null,
  api: null,
  textDrafts: new Map()
};

function randomId() {
  return foundry.utils.randomID();
}

function deepClone(value) {
  return foundry.utils.deepClone(value);
}

function mergeObject(original, other) {
  return foundry.utils.mergeObject(original, other, { inplace: false, insertKeys: true, insertValues: true, overwrite: true });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export class WidgetStore {
  static get defaultState() {
    return {
      widgets: []
    };
  }

  static get defaultWidget() {
    return {
      id: "",
      type: "text",
      title: "Widget",
      position: {
        left: 120,
        top: 120
      },
      size: {
        width: null,
        height: null
      },
      locked: false,
      visible: true,
      config: {}
    };
  }

  static normalizePosition(position = {}) {
    const left = Number.isFinite(Number(position.left)) ? Math.round(Number(position.left)) : 120;
    const top = Number.isFinite(Number(position.top)) ? Math.round(Number(position.top)) : 120;

    return {
      left: Math.max(16, left),
      top: Math.max(16, top)
    };
  }

  static normalizeWidget(widget) {
    const base = mergeObject(this.defaultWidget, widget ?? {});
    base.id = String(base.id || randomId());
    base.type = String(base.type || "text");
    base.title = String(base.title || "Widget");
    base.position = this.normalizePosition(base.position);
    base.size = {
      width: Number.isFinite(Number(base.size?.width)) ? Math.max(180, Math.round(Number(base.size.width))) : null,
      height: Number.isFinite(Number(base.size?.height)) ? Math.max(48, Math.round(Number(base.size.height))) : null
    };
    base.locked = Boolean(base.locked);
    base.visible = base.visible !== false;
    base.config = deepClone(base.config ?? {});
    return base;
  }

  static normalizeState(state) {
    const merged = mergeObject(this.defaultState, state ?? {});
    const widgets = Array.isArray(merged.widgets) ? merged.widgets.map((widget) => this.normalizeWidget(widget)) : [];
    return { widgets };
  }

  static loadState() {
    return this.normalizeState(game.settings.get(WIDGETS_MODULE_ID, WIDGETS_STATE_SETTING));
  }

  static async saveState(nextState) {
    const normalized = this.normalizeState(nextState);
    await game.settings.set(WIDGETS_MODULE_ID, WIDGETS_STATE_SETTING, normalized);
    return normalized;
  }

  static getWidgets() {
    return this.loadState().widgets;
  }

  static getWidget(widgetId) {
    return this.getWidgets().find((widget) => widget.id === widgetId) ?? null;
  }

  static async createWidget(data = {}) {
    const widget = this.normalizeWidget(data);
    const state = this.loadState();
    state.widgets.push(widget);
    await this.saveState(state);
    return widget;
  }

  static async updateWidget(widgetId, updates = {}) {
    const state = this.loadState();
    const index = state.widgets.findIndex((widget) => widget.id === widgetId);
    if (index === -1) throw new Error(`Widget not found: ${widgetId}`);

    const current = state.widgets[index];
    const next = this.normalizeWidget(mergeObject(current, updates));
    state.widgets[index] = next;
    await this.saveState(state);
    return next;
  }

  static async removeWidget(widgetId) {
    const state = this.loadState();
    state.widgets = state.widgets.filter((widget) => widget.id !== widgetId);
    await this.saveState(state);
  }

  static async clearWidgets() {
    await this.saveState(this.defaultState);
  }

  static getInitialPosition(existingCount = 0) {
    const margin = 24;
    const stepX = 32;
    const stepY = 28;
    const columns = 4;
    const col = existingCount % columns;
    const row = Math.floor(existingCount / columns);

    return {
      left: margin + (col * stepX * 2),
      top: margin + (row * stepY * 2)
    };
  }

  static clampPosition(position, width = 320, height = 120) {
    const margin = 16;
    const viewportWidth = window.innerWidth || 1920;
    const viewportHeight = window.innerHeight || 1080;

    return {
      left: clamp(position.left, margin, Math.max(margin, viewportWidth - width - margin)),
      top: clamp(position.top, margin, Math.max(margin, viewportHeight - height - margin))
    };
  }
}

Hooks.once("init", () => {
  game.settings.register(WIDGETS_MODULE_ID, WIDGETS_STATE_SETTING, {
    name: "Widgets State",
    scope: "world",
    config: false,
    type: Object,
    default: WidgetStore.defaultState
  });

  game.settings.register(WIDGETS_MODULE_ID, WIDGETS_ENABLED_SETTING, {
    name: "Enable Widgets",
    hint: "Show floating widgets.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => {
      widgetsModuleState.renderer?.renderAll();
    }
  });
});

widgetsModuleState.WidgetStore = WidgetStore;
widgetsModuleState.deepClone = deepClone;
widgetsModuleState.mergeObject = mergeObject;
