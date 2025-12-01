# MoveAround Galaxy VS Code Theme

This is a VS Code color theme matching the MoveAround Galaxy brand. To use and customize:

## Installation
1. Copy `movearound-galaxy-color-theme.json` to your `.vscode` folder.
2. In VS Code, open the Command Palette (Ctrl+Shift+P), search for `Preferences: Color Theme`, and select `MoveAround Galaxy` (if not listed, use `Preferences: Open Settings (JSON)` and set `"workbench.colorCustomizations"` to point to this file).

## Customization
- To let customers override colors, edit the JSON values in `movearound-galaxy-color-theme.json`.
- Example: Change `"editor.background"` to your preferred color.
- You can also add more color keys as needed (see [VS Code Color Theme Reference](https://code.visualstudio.com/api/references/theme-color)).

## Example Override
```json
{
  "editor.background": "#222244",
  "activityBar.background": "#FF8800"
}
```

## Support
For more customization options, see the [VS Code Theme Color Reference](https://code.visualstudio.com/api/references/theme-color).
