BYTELAB Pixel Siege — bundled webfonts

Vazirmatn
  Files: Vazirmatn-Regular.woff2, Vazirmatn-Medium.woff2, Vazirmatn-Bold.woff2
  Version: 33.0.3 (npm: vazirmatn)
  Author: Saber Rastikerdar
  License: SIL Open Font License 1.1 — see OFL-Vazirmatn.txt
  Source: https://github.com/rastikerdar/vazirmatn

JetBrains Mono
  Files: JetBrainsMono-Regular.woff2, JetBrainsMono-Bold.woff2 (latin subset)
  Version: 5.3.0 build (npm: @fontsource/jetbrains-mono)
  Author: JetBrains
  License: SIL Open Font License 1.1 — see OFL-JetBrainsMono.txt
  Source: https://github.com/JetBrains/JetBrainsMono

Both families are self-hosted by the plugin: no request is made to a font CDN.
The OFL requires the license text to travel with the fonts, which is why the
two OFL-*.txt files sit in this folder.

Refreshing the files
  node tools/fetch-fonts.js      (from the project root)

Removing the fonts
  Delete this folder. The plugin detects the missing files and falls back to
  the system stack (Segoe UI / Tahoma / Menlo / Consolas) without errors.
