import { WidgetStore } from "./store.js";
import { WidgetTypes } from "./widget-types.js";
import { WidgetShell } from "./widget-shell.js";

const widgetsModuleState = globalThis.WidgetsModule;
if (!widgetsModuleState) throw new Error("Widgets module state is not initialized.");

export class WidgetsRenderer {
  constructor() {
    this.root = null;
    this.shells = new Map();
    this.boundHandleResize = this.handleResize.bind(this);
  }

  init() {
    this.ensureRoot();
    window.addEventListener("resize", this.boundHandleResize);
    this.renderAll();
  }

  ensureRoot() {
    let root = document.getElementById("widgets-root");
    if (!root) {
      root = document.createElement("div");
      root.id = "widgets-root";
      document.body.appendChild(root);
    }

    this.root = root;
    return root;
  }

  destroyRoot() {
    this.shells.clear();
    this.root?.remove();
    this.root = null;
  }

  renderAll() {
    const enabled = game.settings.get(widgetsModuleState.MODULE_ID, "enabled");
    if (!enabled) {
      this.destroyRoot();
      return;
    }

    const root = this.ensureRoot();
    root.innerHTML = "";
    this.shells.clear();

    for (const widget of WidgetStore.getWidgets()) {
      if (widget.visible === false) continue;
      const definition = WidgetTypes.get(widget.type);
      if (!definition) continue;
      const shell = new WidgetShell(widget, this);
      const contentHtml = definition.render(widget);
      const element = shell.render(contentHtml);
      this.shells.set(widget.id, shell);
      root.appendChild(element);
      definition.activate?.(widget, element);
    }
  }

  handleResize() {
    if (!this.root) return;

    for (const widget of WidgetStore.getWidgets()) {
      const element = this.root.querySelector(`[data-widget-id='${widget.id}']`);
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      const width = rect.width || 320;
      const height = rect.height || 120;
      const clamped = WidgetStore.clampPosition(widget.position, width, height);
      if (clamped.left !== widget.position.left || clamped.top !== widget.position.top) {
        WidgetStore.updateWidget(widget.id, { position: clamped }).catch(console.error);
      }
    }

    this.renderAll();
  }
}

Hooks.once("ready", () => {
  const renderer = new WidgetsRenderer();
  widgetsModuleState.renderer = renderer;
  renderer.init();
});

Hooks.on("updateSetting", (setting) => {
  if (!setting?.key?.startsWith(`${widgetsModuleState.MODULE_ID}.`)) return;
  widgetsModuleState.renderer?.renderAll();
  if (widgetsModuleState.managerApp?.rendered) {
    widgetsModuleState.managerApp.render(false);
  }
});

Hooks.on("updateActor", () => widgetsModuleState.renderer?.renderAll());
Hooks.on("createActor", () => widgetsModuleState.renderer?.renderAll());
Hooks.on("deleteActor", () => widgetsModuleState.renderer?.renderAll());
Hooks.on("updateUser", () => widgetsModuleState.renderer?.renderAll());

widgetsModuleState.WidgetsRenderer = WidgetsRenderer;
