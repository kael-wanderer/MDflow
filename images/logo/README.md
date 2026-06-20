# MDflow icon spacing trials

Each variant uses the same original MDflow Flow Mark and charcoal tile. Only the
internal artwork scale changes:

- `roomy`: approximately 18–20% visual margin; closest to the preferred reference ratio.
- `balanced`: approximately 13–15% visual margin.
- `compact`: approximately 9–11% visual margin.

Each folder contains PNG exports at 16, 32, 64, 128, 256, 512, and 1024 pixels.
The SVG files are the editable masters. Each `tauri-icons` subfolder also contains
an install-ready macOS `.icns`, Windows `.ico`, and the standard Tauri PNG set.

To try a variant in the app, copy that variant's generated bundle into
`src-tauri/icons` and rebuild. For example:

```bash
cp -R images/logo/roomy/tauri-icons/. src-tauri/icons/
npm run tauri build
```

Keep the existing `src-tauri/icons` folder backed up until a variant is chosen.
