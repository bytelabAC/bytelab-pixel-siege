const hosts = [
  "https://cdn.jsdelivr.net/npm/vazirmatn@33.0.3/package.json",
  "https://data.jsdelivr.com/v1/package/npm/vazirmatn@33.0.3",
  "https://raw.githubusercontent.com/rastikerdar/vazirmatn/master/package.json",
  "https://registry.npmjs.org/vazirmatn",
  "https://unpkg.com/vazirmatn@33.0.3/package.json",
  "https://github.com/rastikerdar/vazirmatn/raw/master/package.json"
];
(async () => {
  for (const u of hosts) {
    try {
      const r = await fetch(u, { redirect: "follow" });
      console.log("OK ", r.status, u);
    } catch (e) {
      console.log("ERR", u, "|", e.message, "|", e.cause && (e.cause.code || e.cause.message));
    }
  }
})();
