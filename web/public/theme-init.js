try { const t = localStorage.getItem("articx-theme"); if (t === "light" || t === "dark") document.documentElement.dataset.theme = t; } catch (e) {}
