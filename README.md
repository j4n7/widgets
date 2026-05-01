# Widgets

Phase 1 base module for floating widgets in Foundry VTT 13.

## Included in this build

- Floating DOM-based widgets
- Drag and snap positioning
- Persistent client-side layout
- Widgets manager window
- Text widget
- Party actors widget

## Quick start

1. Enable the module.
2. Run this macro:

```js
await globalThis.Widgets.openManager();
```

3. Create a widget from the manager.

## Notes

- Widget layouts are stored per client.
- The Party Actors widget currently reads actors assigned to non-GM users.
- The Party Actors widget is designed for dnd5e and shows portrait, level, HP and hit dice.
