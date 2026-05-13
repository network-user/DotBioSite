import { useEffect, useState } from "react";

interface Props {
  current: "ru" | "en";
  alternate: "ru" | "en";
  alternateUrl: string;
  label: string;
}

/**
 * LanguageToggle — кнопка/ссылка переключения локали + клиентский auto-detect.
 *
 * Логика как в DotSound:
 *   1) При маунте читаем localStorage `dc-locale`.
 *   2) Если ключа нет — определяем язык: navigator.languages[0].startsWith("ru") ? ru : en.
 *   3) Если определённый язык НЕ совпадает с текущим URL — делаем soft-redirect.
 *   4) Сохраняем выбор в localStorage, чтобы потом не редиректить повторно.
 *
 * На клик: записываем выбор и идём по `alternateUrl`.
 */
export default function LanguageToggle({ current, alternate, alternateUrl, label }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("dc-locale");
      if (saved === "ru" || saved === "en") {
        if (saved !== current) {
          window.location.replace(saved === "en" ? "/en" : "/");
        }
        return;
      }
      const nav = (navigator.languages?.[0] || navigator.language || "ru").toLowerCase();
      const detected: "ru" | "en" = nav.startsWith("ru") ? "ru" : "en";
      if (detected !== current) {
        localStorage.setItem("dc-locale", detected);
        window.location.replace(detected === "en" ? "/en" : "/");
      } else {
        localStorage.setItem("dc-locale", detected);
      }
    } catch {
      /* localStorage недоступен — игнорируем */
    }
  }, [current]);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    try {
      localStorage.setItem("dc-locale", alternate);
    } catch {
      /* noop */
    }
    window.location.assign(alternateUrl);
  }

  return (
    <a
      href={alternateUrl}
      onClick={handleClick}
      className="lang-toggle"
      data-mounted={mounted ? "1" : "0"}
      aria-label={`Switch language to ${alternate.toUpperCase()}`}
      lang={alternate}
    >
      <span aria-hidden="true">{label}</span>
    </a>
  );
}
