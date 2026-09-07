// Recupera a pré-visualização automaticamente quando o servidor de
// desenvolvimento reinicia (a página ficaria em branco até um F5 manual).
if (import.meta.env.DEV && typeof window !== "undefined") {
  let attempts = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
    attempts = 0;
  };

  const scheduleReload = () => {
    if (timer) return;
    const delay = Math.min(1000 * 2 ** attempts, 8000);
    attempts += 1;
    timer = setTimeout(() => {
      timer = undefined;
      // Só recarrega se o servidor já responder de novo.
      fetch(`${location.origin}/@vite/client`, { cache: "no-store" })
        .then((res) => {
          if (res.ok) {
            location.reload();
          } else {
            scheduleReload();
          }
        })
        .catch(() => scheduleReload());
    }, delay);
  };

  if (import.meta.hot) {
    import.meta.hot.on("vite:ws:disconnect", scheduleReload);
    import.meta.hot.on("vite:ws:connect", cancel);
  }

  window.addEventListener("online", scheduleReload);
}

export {};
