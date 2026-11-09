const fs = require("fs");
const path = require("path");
const outDir = path.join(__dirname, "..", "bytelab-pixel-siege", "assets", "fonts");
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  ["Vazirmatn-Regular.woff2", "https://unpkg.com/vazirmatn@33.0.3/fonts/webfonts/Vazirmatn-Regular.woff2"],
  ["Vazirmatn-Medium.woff2", "https://unpkg.com/vazirmatn@33.0.3/fonts/webfonts/Vazirmatn-Medium.woff2"],
  ["Vazirmatn-Bold.woff2", "https://unpkg.com/vazirmatn@33.0.3/fonts/webfonts/Vazirmatn-Bold.woff2"],
  ["OFL-Vazirmatn.txt", "https://unpkg.com/vazirmatn@33.0.3/OFL.txt"],
  ["JetBrainsMono-Regular.woff2", "https://unpkg.com/@fontsource/jetbrains-mono@5.3.0/files/jetbrains-mono-latin-400-normal.woff2"],
  ["JetBrainsMono-Bold.woff2", "https://unpkg.com/@fontsource/jetbrains-mono@5.3.0/files/jetbrains-mono-latin-700-normal.woff2"],
  ["OFL-JetBrainsMono.txt", "https://unpkg.com/@fontsource/jetbrains-mono@5.3.0/LICENSE"]
];

(async () => {
  for (const [name, url] of targets) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) { console.log("FAIL", name, res.status); continue; }
      const buf = Buffer.from(await res.arrayBuffer());
      const isText = /\.txt$/.test(name);
      const magic = buf.slice(0, 4).toString("ascii");
      if (!isText && magic !== "wOF2") { console.log("BAD MAGIC", name, magic); continue; }
      fs.writeFileSync(path.join(outDir, name), buf);
      console.log(name.padEnd(30), (buf.length / 1024).toFixed(1) + " kB", isText ? "text" : "wOF2 ok");
    } catch (e) { console.log("ERR", name, e.message); }
  }
})();
