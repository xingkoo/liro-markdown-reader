# Liro Markdown Reader

## Languages

- English
- [中文](./README.zh-CN.md)

Liro is a mac-first Markdown reader for individual documents and folder-based documentation projects.

## Features

- Open a single Markdown file
- Open a documentation folder as a project
- Browse directory navigation
- Follow internal Markdown links
- Render with a GitHub-like style
- Store recent history locally in a JSON file

## Platforms

- macOS: tested
- Windows: not tested yet
- Linux: not tested yet

## Build

Install dependencies first:

```bash
npm install
```

Build the web assets:

```bash
npm run build
```

Build the desktop app on the current platform:

```bash
npm run bundle
```

Notes:

- `dmg` packaging is expected to be built on a real macOS environment or CI runner. The current Codex sandboxed environment cannot create the disk image here, so `tauri build` can complete the app bundle step but fail at `hdiutil create`.
- Windows and Linux release packages should be built on their respective platforms.
- If you want a single downloadable archive on macOS, you can also zip the `.app` bundle after building.

## Release

Push a tag that starts with `v`, for example:

```bash
git tag v0.1.5
git push origin v0.1.5
```

That will trigger the GitHub Actions release workflow in [`.github/workflows/release.yml`](/Users/xing/Documents/Dev/Project/liro/.github/workflows/release.yml) and publish assets for macOS, Windows, and Linux.
For the most reliable result, push the branch first and then push the tag separately.

## CI

- Pushes to `main` and pull requests run build verification in [`.github/workflows/ci.yml`](/Users/xing/Documents/Dev/Project/liro/.github/workflows/ci.yml)
- Tag pushes like `v0.1.1` trigger the release workflow and publish GitHub release assets

## Development

```bash
npm install
npm run tauri
```

## macOS first-run fix

If macOS reports that the app is from an unidentified developer or a quarantined app, run:

```bash
bash scripts/unquarantine-macos.sh /Applications/Liro.app
```

If you copied the app bundle somewhere else, pass that path instead of `/Applications/Liro.app`.
