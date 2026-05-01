import { WidgetStore } from "./store.js";

const widgetsModuleState = globalThis.WidgetsModule;
if (!widgetsModuleState) throw new Error("Widgets module state is not initialized.");

function getProperty(object, path, fallback = null) {
  if (!object || !path) return fallback;
  const value = foundry.utils.getProperty(object, path);
  return value ?? fallback;
}

function formatPair(current, max) {
  return `${current} / ${max}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadDraftText(widget) {
  return widgetsModuleState.textDrafts.get(widget.id) ?? String(widget.config?.text ?? "");
}

function saveDraftText(widgetId, text) {
  widgetsModuleState.textDrafts.set(widgetId, String(text ?? ""));
}

function clearDraftText(widgetId) {
  widgetsModuleState.textDrafts.delete(widgetId);
}

function getAssignedPlayerActors() {
  const seen = new Set();
  const actors = [];

  for (const user of game.users) {
    if (user.isGM) continue;
    const actor = user.character;
    if (!actor) continue;
    if (seen.has(actor.id)) continue;
    seen.add(actor.id);
    actors.push(actor);
  }

  return actors.sort((left, right) => left.name.localeCompare(right.name));
}

function getActorPortrait(actor) {
  return actor.img || actor.prototypeToken?.texture?.src || "icons/svg/mystery-man.svg";
}

function getActorLevel(actor) {
  const detailsLevel = getProperty(actor, "system.details.level");
  if (Number.isFinite(Number(detailsLevel))) return Number(detailsLevel);

  const classes = getProperty(actor, "system.classes", {});
  const classLevels = Object.values(classes ?? {}).reduce((sum, entry) => sum + Number(entry?.levels ?? 0), 0);
  return classLevels || 0;
}

function getActorHp(actor) {
  const value = Number(getProperty(actor, "system.attributes.hp.value", 0));
  const max = Number(getProperty(actor, "system.attributes.hp.max", 0));
  return {
    value: Number.isFinite(value) ? value : 0,
    max: Number.isFinite(max) ? max : 0
  };
}

function getActorHitDice(actor) {
  const value = Number(getProperty(actor, "system.attributes.hd.value", 0));
  const max = Number(getProperty(actor, "system.attributes.hd.max", 0));
  return {
    value: Number.isFinite(value) ? value : 0,
    max: Number.isFinite(max) ? max : 0
  };
}

function getActorDamageOverlayInset(actor) {
  const hp = getActorHp(actor);
  const max = Number(hp.max) || 0;
  const value = Math.max(0, Number(hp.value) || 0);
  if (max <= 0) return 100;
  const healthRatio = Math.max(0, Math.min(1, value / max));
  const damageRatio = 1 - healthRatio;
  return Math.round((1 - damageRatio) * 100);
}

function getActorSpellSlotsData(actor) {
  const parts = [];
  const spells = getProperty(actor, "system.spells", {}) ?? {};

  for (let level = 1; level <= 9; level += 1) {
    const slotData = spells[`spell${level}`];
    if (!slotData) continue;
    const max = Number(slotData.max ?? 0);
    const value = Number(slotData.value ?? 0);
    if (max > 0) parts.push({ key: String(level), value: `${value}/${max}` });
  }

  const pact = spells.pact;
  if (pact) {
    const pactMax = Number(pact.max ?? 0);
    const pactValue = Number(pact.value ?? 0);
    const pactLevel = Number(pact.level ?? 0);
    if (pactMax > 0 && pactLevel > 0) {
      parts.push({ key: `P${pactLevel}`, value: `${pactValue}/${pactMax}` });
    }
  }

  return parts;
}

function renderActorSpellSlots(actor) {
  const slots = getActorSpellSlotsData(actor);

  if (!slots.length) {
    return `<span class="widgets-actor-resource-value">—</span>`;
  }

  return `
    <span class="widgets-actor-slots-list">
      ${slots.map((slot) => `
        <span class="widgets-actor-slot-chip">
          <span class="widgets-actor-slot-key">${escapeHtml(slot.key)}</span>
          <span class="widgets-actor-slot-value">${escapeHtml(slot.value)}</span>
        </span>
      `).join("\n")}
    </span>
  `;
}

function getActorHealingPotionCount(actor) {
  const items = actor?.items ?? [];
  let total = 0;

  for (const item of items) {
    if (!item) continue;
    if (item.type !== "consumable" && item.type !== "loot") continue;

    const name = String(item.name ?? "").trim().toLowerCase();

    const isHealingPotion =
      name === "potion of healing" ||
      name === "healing potion" ||
      name.includes("potion of healing") ||
      name.includes("healing potion") ||
      name.includes("poción de curación") ||
      name.includes("pocion de curacion") ||
      name.includes("poción curativa") ||
      name.includes("pocion curativa");

    if (!isHealingPotion) continue;

    const quantity = Number(getProperty(item, "system.quantity", 0));
    total += Number.isFinite(quantity) ? quantity : 0;
  }

  return total;
}

function renderActorCard(actor) {
  const hp = getActorHp(actor);
  const hd = getActorHitDice(actor);
  const portrait = getActorPortrait(actor);
  const level = getActorLevel(actor);
  const slotsHtml = renderActorSpellSlots(actor);
  const potionCount = getActorHealingPotionCount(actor);

  return `
    <article class="widgets-actor-card" data-actor-id="${actor.id}">
      <div class="widgets-actor-portrait-frame">
        <img
          class="widgets-actor-portrait"
          src="${portrait}"
          alt="${escapeHtml(actor.name)} portrait"
          loading="lazy"
        />
        <div
          class="widgets-actor-damage-overlay"
          style="clip-path: inset(${getActorDamageOverlayInset(actor)}% 0 0 0);"
          aria-hidden="true"
        ></div>
      </div>

      <div class="widgets-actor-details">
        <!-- <div class="widgets-actor-name">${escapeHtml(actor.name)}</div> -->
        <!-- <div class="widgets-actor-line">Level ${level}</div> -->

        <div class="widgets-actor-line widgets-actor-resource-line">
          <i class="fas fa-heart widgets-actor-resource-icon" aria-hidden="true"></i>
          <!-- <span class="widgets-actor-resource-label">HP:</span> -->
          <span class="widgets-actor-resource-value">${formatPair(hp.value, hp.max)}</span>
        </div>

        <div class="widgets-actor-line widgets-actor-resource-line">
          <i class="fas fa-syringe widgets-actor-resource-icon" aria-hidden="true"></i>
          <!-- <span class="widgets-actor-resource-label">HD:</span> -->
          <span class="widgets-actor-resource-value">${formatPair(hd.value, hd.max)}</span>
        </div>

        <div class="widgets-actor-line widgets-actor-resource-line">
          <i class="fas fa-flask widgets-actor-resource-icon" aria-hidden="true"></i>
          <!-- <span class="widgets-actor-resource-label">Potions:</span> -->
          <span class="widgets-actor-resource-value">${potionCount}</span>
        </div>

        <div class="widgets-actor-line widgets-actor-resource-line widgets-actor-slots-line">
          <i class="fas fa-wand-magic-sparkles widgets-actor-resource-icon" aria-hidden="true"></i>
          <!-- <span class="widgets-actor-resource-label">Slots:</span> -->
          ${slotsHtml}
        </div>
      </div>
    </article>
  `;
}

function applyPortraitCropping(rootElement) {
  const portraits = rootElement.querySelectorAll(".widgets-actor-portrait");

  for (const portrait of portraits) {
    const updatePortraitClass = () => {
      portrait.classList.remove("is-portrait-vertical");

      if ((portrait.naturalHeight || 0) > (portrait.naturalWidth || 0)) {
        portrait.classList.add("is-portrait-vertical");
      }
    };

    if (portrait.complete) {
      updatePortraitClass();
    } else {
      portrait.addEventListener("load", updatePortraitClass, { once: true });
    }
  }
}

export const WidgetTypes = {
  register(typeId, definition) {
    widgetsModuleState.widgetTypes.set(typeId, definition);
  },

  get(typeId) {
    return widgetsModuleState.widgetTypes.get(typeId) ?? null;
  },

  list() {
    return Array.from(widgetsModuleState.widgetTypes.entries()).map(([id, definition]) => ({
      id,
      ...definition
    }));
  }
};

Hooks.once("ready", () => {
  WidgetTypes.register("text", {
    label: "Text",

    createDefault(existingCount = 0) {
      return WidgetStore.normalizeWidget({
        type: "text",
        title: `Text ${existingCount + 1}`,
        position: WidgetStore.getInitialPosition(existingCount),
        config: { text: "" }
      });
    },

    render(widget) {
      const text = String(widget.config?.text ?? "");
      const isEditable = game.user?.isGM === true;
      const draftText = isEditable ? loadDraftText(widget) : text;

      if (isEditable) {
        return `
          <div class="widgets-text-card">
            <textarea
              class="widgets-textarea"
              data-widget-text-editor="${widget.id}"
              placeholder="Write here..."
              spellcheck="false"
            >${escapeHtml(draftText)}</textarea>
          </div>
        `;
      }

      return `
        <div class="widgets-text-card">
          <div class="widgets-text-content ${text.trim() ? "" : "is-empty"}">${text.trim() ? escapeHtml(text).replaceAll("\n", "<br>") : "No text yet."}</div>
        </div>
      `;
    },

    activate(widget, element) {
      if (game.user?.isGM !== true) return;

      const textarea = element.querySelector(`[data-widget-text-editor="${widget.id}"]`);
      if (!textarea) return;

      let committedText = String(widget.config?.text ?? "");
      textarea.value = loadDraftText(widget);
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(96, textarea.scrollHeight)}px`;

      textarea.addEventListener("input", () => {
        saveDraftText(widget.id, textarea.value);
        textarea.style.height = "auto";
        textarea.style.height = `${Math.max(96, textarea.scrollHeight)}px`;
      });

      textarea.addEventListener("blur", async () => {
        const nextText = textarea.value;
        saveDraftText(widget.id, nextText);

        if (nextText === committedText) return;

        committedText = nextText;
        await WidgetStore.updateWidget(widget.id, {
          config: {
            ...(widget.config ?? {}),
            text: nextText
          }
        });
        clearDraftText(widget.id);
      });
    }
  });

  WidgetTypes.register("party-actors", {
    label: "Party Actors",

    createDefault(existingCount = 0) {
      return WidgetStore.normalizeWidget({
        type: "party-actors",
        title: "Party",
        position: WidgetStore.getInitialPosition(existingCount),
        config: { source: "assigned-players" }
      });
    },

    render() {
      const actors = getAssignedPlayerActors();

      if (!actors.length) {
        return `
          <div class="widgets-empty-state">
            No player-assigned actors found.
          </div>
        `;
      }

      return `
        <div class="widgets-actor-strip">
          ${actors.map((actor) => renderActorCard(actor)).join("\n")}
        </div>
      `;
    },

    activate(widget, element) {
      applyPortraitCropping(element);
    }
  });
});

widgetsModuleState.WidgetTypes = WidgetTypes;
widgetsModuleState.getAssignedPlayerActors = getAssignedPlayerActors;
widgetsModuleState.applyPortraitCropping = applyPortraitCropping;
