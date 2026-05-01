import { WidgetStore } from "./store.js";
import { WidgetTypes } from "./widget-types.js";
import { WidgetsManagerApp } from "./manager.js";

const widgetsModuleState = globalThis.WidgetsModule;
if (!widgetsModuleState) throw new Error("Widgets module state is not initialized.");

const api = {
  MODULE_ID: widgetsModuleState.MODULE_ID,

  getWidgets() {
    return WidgetStore.getWidgets();
  },

  getWidget(widgetId) {
    return WidgetStore.getWidget(widgetId);
  },

  async createWidget(typeId, data = {}) {
    if (game.user?.isGM !== true) return null;
    const definition = WidgetTypes.get(typeId);
    if (!definition) throw new Error(`Unknown widget type: ${typeId}`);

    const count = WidgetStore.getWidgets().length;
    const base = definition.createDefault(count);
    return WidgetStore.createWidget(foundry.utils.mergeObject(base, data, { inplace: false }));
  },

  async updateWidget(widgetId, updates = {}) {
    if (game.user?.isGM !== true) return null;
    return WidgetStore.updateWidget(widgetId, updates);
  },

  async removeWidget(widgetId) {
    if (game.user?.isGM !== true) return;
    await WidgetStore.removeWidget(widgetId);
  },

  async clearWidgets() {
    if (game.user?.isGM !== true) return;
    await WidgetStore.clearWidgets();
  },

  renderAll() {
    widgetsModuleState.renderer?.renderAll();
  },

  async openManager() {
    if (game.user?.isGM !== true) return null;
    if (!widgetsModuleState.managerApp) {
      widgetsModuleState.managerApp = new WidgetsManagerApp();
    }
    await widgetsModuleState.managerApp.render(true);
    return widgetsModuleState.managerApp;
  }
};

widgetsModuleState.api = api;
globalThis.Widgets = api;
