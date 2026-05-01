import { WidgetStore } from "./store.js";
import { WidgetTypes } from "./widget-types.js";

const widgetsModuleState = globalThis.WidgetsModule;
if (!widgetsModuleState) throw new Error("Widgets module state is not initialized.");

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class WidgetsManagerApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "widgets-manager",
    tag: "section",
    classes: ["widgets-manager-app"],
    window: {
      title: "Widgets Manager",
      positioned: true,
      resizable: true
    },
    position: {
      width: 620,
      height: 520
    }
  };

  static PARTS = {
    content: {
      template: "modules/widgets/templates/widget-manager.hbs"
    }
  };

  async _prepareContext() {
    return {
      widgets: WidgetStore.getWidgets(),
      widgetTypes: WidgetTypes.list(),
      hasWidgets: WidgetStore.getWidgets().length > 0
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    if (game.user?.isGM !== true) return;

    const root = this.element;
    if (!root) return;

    root.querySelector("[data-action='create-text']")?.addEventListener("click", async () => {
      const count = WidgetStore.getWidgets().length;
      const type = WidgetTypes.get("text");
      const widget = type.createDefault(count);
      await WidgetStore.createWidget(widget);
      await this.render(true);
    });

    root.querySelector("[data-action='create-party-actors']")?.addEventListener("click", async () => {
      const count = WidgetStore.getWidgets().length;
      const type = WidgetTypes.get("party-actors");
      const widget = type.createDefault(count);
      await WidgetStore.createWidget(widget);
      await this.render(true);
    });

    root.querySelector("[data-action='clear-all']")?.addEventListener("click", async () => {
      const confirmed = await Dialog.confirm({
        title: "Clear All Widgets",
        content: "<p>Remove all widgets from the world layout?</p>"
      });

      if (!confirmed) return;
      await WidgetStore.clearWidgets();
      await this.render(true);
    });

    for (const removeButton of root.querySelectorAll("[data-action='remove-widget']")) {
      removeButton.addEventListener("click", async (event) => {
        const widgetId = event.currentTarget.dataset.widgetId;
        await WidgetStore.removeWidget(widgetId);
        await this.render(true);
      });
    }

    for (const lockButton of root.querySelectorAll("[data-action='toggle-lock']")) {
      lockButton.addEventListener("click", async (event) => {
        const widgetId = event.currentTarget.dataset.widgetId;
        const widget = WidgetStore.getWidget(widgetId);
        if (!widget) return;
        await WidgetStore.updateWidget(widgetId, { locked: !widget.locked });
        await this.render(true);
      });
    }
  }
}

widgetsModuleState.WidgetsManagerApp = WidgetsManagerApp;
