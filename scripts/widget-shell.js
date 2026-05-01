import { WidgetStore } from "./store.js";

const widgetsModuleState = globalThis.WidgetsModule;
if (!widgetsModuleState) throw new Error("Widgets module state is not initialized.");

function snapValue(value, grid) {
  return Math.round(value / grid) * grid;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export class WidgetShell {
  constructor(widget, renderer) {
    this.widget = widget;
    this.renderer = renderer;
    this.element = null;
    this.dragState = null;
    this.boundPointerMove = this.onPointerMove.bind(this);
    this.boundPointerUp = this.onPointerUp.bind(this);
  }

  render(contentHtml) {
    const isGM = game.user?.isGM === true;
    const root = document.createElement("section");
    root.className = "widgets-shell";
    root.dataset.widgetId = this.widget.id;
    root.dataset.widgetType = this.widget.type;
    root.dataset.locked = String(this.widget.locked);
    root.dataset.gm = String(game.user?.isGM === true);

    root.innerHTML = `
      <div class="widgets-shell-header-card" ${isGM ? 'data-drag-handle="true"' : ""}>
        <div class="widgets-shell-header-row">
          <div class="widgets-shell-title">${this.widget.title}</div>

          ${isGM ? `
            <div class="widgets-shell-actions">
              <button
                type="button"
                class="widgets-shell-button"
                data-action="toggle-lock"
                title="Toggle lock"
                aria-label="Toggle lock"
              >
                <i class="fas ${this.widget.locked ? "fa-lock" : "fa-lock-open"}"></i>
              </button>

              <button
                type="button"
                class="widgets-shell-button"
                data-action="hide"
                title="Hide widget"
                aria-label="Hide widget"
              >
                <i class="fas fa-xmark"></i>
              </button>
            </div>
          ` : ""}
        </div>
      </div>

      <div class="widgets-shell-body">
        ${contentHtml}
      </div>
    `;

    this.element = root;
    this.applyPosition();
    this.activateListeners();
    return root;
  }

  applyPosition() {
    if (!this.element) return;

    const height = this.widget.size?.height;

    if (Number.isFinite(height)) {
      this.element.style.height = `${height}px`;
    } else {
      this.element.style.removeProperty("height");
    }

    this.element.style.removeProperty("width");
    this.element.style.left = `${this.widget.position.left}px`;
    this.element.style.top = `${this.widget.position.top}px`;
  }

  activateListeners() {
    if (!this.element || game.user?.isGM !== true) return;

    this.element.querySelector("[data-action='hide']")?.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await WidgetStore.hideWidget(this.widget.id);
    });

    this.element.querySelector("[data-action='toggle-lock']")?.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const nextLocked = !this.widget.locked;
      await WidgetStore.updateWidget(this.widget.id, { locked: nextLocked });
    });

    const handle = this.element.querySelector("[data-drag-handle='true']");
    handle?.addEventListener("pointerdown", (event) => this.onPointerDown(event));
  }

  onPointerDown(event) {
    if (game.user?.isGM !== true) return;
    if (event.button !== 0) return;
    if (this.widget.locked) return;

    const clickedButton = event.target.closest("button");
    if (clickedButton) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = this.element.getBoundingClientRect();
    this.dragState = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      width: rect.width,
      height: rect.height
    };

    this.element.classList.add("is-dragging");
    window.addEventListener("pointermove", this.boundPointerMove);
    window.addEventListener("pointerup", this.boundPointerUp, { once: true });
  }

  onPointerMove(event) {
    if (!this.dragState || !this.element) return;

    const deltaX = event.clientX - this.dragState.startX;
    const deltaY = event.clientY - this.dragState.startY;

    const nextLeft = this.dragState.startLeft + deltaX;
    const nextTop = this.dragState.startTop + deltaY;

    this.element.style.left = `${nextLeft}px`;
    this.element.style.top = `${nextTop}px`;
  }

  async onPointerUp() {
    window.removeEventListener("pointermove", this.boundPointerMove);

    if (!this.dragState || !this.element) return;

    this.element.classList.remove("is-dragging");

    const rect = this.element.getBoundingClientRect();
    const snapped = this.computeSnappedPosition(rect, this.dragState.width, this.dragState.height);

    this.element.style.left = `${snapped.left}px`;
    this.element.style.top = `${snapped.top}px`;

    await WidgetStore.updateWidget(this.widget.id, {
      position: {
        left: snapped.left,
        top: snapped.top
      }
    });

    this.dragState = null;
  }

  computeSnappedPosition(rect, width, height) {
    const margin = 16;
    const grid = 8;
    const threshold = 24;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = snapValue(rect.left, grid);
    let top = snapValue(rect.top, grid);

    if (Math.abs(left - margin) <= threshold) left = margin;
    if (Math.abs(top - margin) <= threshold) top = margin;

    const rightTarget = viewportWidth - width - margin;
    const bottomTarget = viewportHeight - height - margin;

    if (Math.abs(left - rightTarget) <= threshold) left = rightTarget;
    if (Math.abs(top - bottomTarget) <= threshold) top = bottomTarget;

    left = clamp(left, margin, Math.max(margin, viewportWidth - width - margin));
    top = clamp(top, margin, Math.max(margin, viewportHeight - height - margin));

    return { left, top };
  }
}

widgetsModuleState.WidgetShell = WidgetShell;
