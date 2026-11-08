// Klien untuk Apps Script Web App. Jalan di browser (window.FuukaApi) dan Node (untuk tes).
(function (root) {
  function createApi(options) {
    const getUrl = options.getUrl;
    const fetchImpl = options.fetchImpl;

    // Semua aksi ber-PIN memakai POST text/plain agar tidak memicu preflight CORS. Tanpa retry.
    async function post(body) {
      const url = getUrl();
      if (!url) throw new Error("API_URL belum diisi di config.js");
      let res;
      try {
        res = await fetchImpl(url, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(body)
        });
      } catch (e) {
        throw new Error("Server tidak bisa dijangkau");
      }
      let payload;
      try {
        payload = await res.json();
      } catch (e) {
        throw new Error("Server tidak bisa dijangkau (respons bukan JSON)");
      }
      if (!payload || !payload.ok) throw new Error((payload && payload.error) || "Terjadi kesalahan di server");
      return payload.data;
    }

    return {
      login: (pin) => post({ action: "login", pin }),
      readAdmin: (tab, pin) => post({ action: "read_admin", tab, pin }),
      save: (tab, rows, pin) => post({ action: "save", tab, rows, pin })
    };
  }

  const api = { createApi };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.FuukaApi = api;
})(typeof window !== "undefined" ? window : globalThis);
