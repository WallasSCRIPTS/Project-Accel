<div align="center">
  <img src="assets/logo/projectaccel-badge.png" alt="ProjectAccel" width="112" />
  <h1>ProjectAccel</h1>
  <p><strong>Mouse acceleration, reimagined.</strong></p>
  <p>A clean, native Windows workspace for shaping and previewing mouse response curves.</p>
  <p>
    <img alt="Platform" src="https://img.shields.io/badge/platform-Windows%2010%2F11-111111?style=flat-square">
    <img alt="License" src="https://img.shields.io/badge/license-MIT-111111?style=flat-square">
  </p>
</div>

> **Project status:** the Windows app currently provides a live curve editor and device information. Applying curves to mouse input is not available yet; the native mouse driver is still under development. The current editor is a preview and does not change system pointer behavior.

## What it does

- Preview eight response modes, including classic, natural, synchronous, jump, and lookup table curves.
- Tune curve parameters and drag lookup table points, with optional 15° angle snapping.
- Switch between light and dark themes, or follow the system setting.
- Use the interface in Portuguese, English, Spanish, or Russian.
- Inspect connected mouse devices and save local DPI and polling-rate notes.
- Run in a native Windows window powered by WinForms and WebView2.

## Download

Windows x64 releases will be available from this repository's **Releases** page. Packages require the Microsoft Edge WebView2 Runtime. If a release is not available yet, build the app from source using the steps below.

## Build from source

Requirements: Windows 10/11, .NET SDK 8 or newer, Node.js 22 or newer, and the WebView2 Runtime.

```powershell
cd web
npm ci
npm run build
cd ..
dotnet build ProjectAccel.sln -c Release
dotnet run --project src/ProjectAccel.App
```

## Project layout

| Path | Purpose |
| --- | --- |
| `web/` | React + TypeScript interface and curve preview |
| `src/ProjectAccel.App/` | Native WinForms host and WebView2 bridge |
| `src/ProjectAccel.Core/` | Curve and product domain code |
| `src/ProjectAccel.Backend/` | Backend abstraction for preview and future driver integration |
| `tests/` | Core behavior tests |
| `docs/PLAN.md` | Product and engineering roadmap |

## Releases

Create a version tag such as `v0.2.0` to build and publish a Windows x64 release. GitHub Actions builds the web UI, publishes the desktop app, packages it as a zip, and attaches the archive with generated release notes.

## Contributing

Issues and pull requests are welcome. Please describe the Windows version, steps to reproduce, and expected behavior when reporting a bug. Driver support and system-wide input changes are planned work; do not assume the current preview changes mouse behavior.

## Credits and license

ProjectAccel is an independent project and is not affiliated with any mouse-acceleration software. Interface icons use [MingCute](https://www.mingcute.com). Project source is licensed under the MIT License; see [`LICENSE`](LICENSE).

---

<details>
<summary>Português</summary>

O ProjectAccel é um aplicativo nativo para Windows que permite editar e visualizar curvas de resposta do mouse. A prévia atual **não altera o comportamento do cursor**; a aplicação de curvas ao mouse depende do driver, que continua em desenvolvimento.

O app inclui oito modos de curva, ajuste angular de 15° para pontos da tabela, temas claro/escuro/sistema e interface em português, inglês, espanhol e russo. Consulte a aba **Releases** deste repositório para baixar as versões públicas. Para compilar, siga os comandos acima.

</details>
