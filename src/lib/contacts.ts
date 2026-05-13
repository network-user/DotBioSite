/**
 * contacts.ts — обфускация email и helpers для контактных секций.
 *
 * Email НЕ должен попадать в plain HTML — иначе его подберёт любой scraper.
 * Стратегия:
 *   1) На этапе билда из AUTHOR_EMAIL (server-only переменная) получаем base64.
 *   2) В HTML рендерится только base64-строка в `data-e` атрибуте кнопки.
 *   3) Клиентский JS декодирует на клик и открывает `mailto:`.
 *
 * Дополнительно используется обратный порядок символов перед base64, чтобы
 * даже если scraper научится атобе — он получит не сразу адрес.
 */

import { config } from "./config";

/** Кодируем email безопасно для любого окружения (Node Buffer / btoa). */
function encodeEmail(email: string): string {
  if (!email) return "";
  const reversed = email.split("").reverse().join("");
  if (typeof btoa === "function") {
    return btoa(unescape(encodeURIComponent(reversed)));
  }
  // Node.js fallback (Astro/Vite build runs in Node)
  return Buffer.from(reversed, "utf-8").toString("base64");
}

export const emailB64 = encodeEmail(config.AUTHOR_EMAIL);
export const hasEmail = emailB64.length > 0;

/**
 * Инлайновый JS-скрипт для декодирования email на клик.
 * Вставляется ОДИН РАЗ на странице, обрабатывает все кнопки `.contact-email`.
 */
export const emailDecoderScript = /* js */ `
(function () {
  function decode(b64) {
    try {
      var str = decodeURIComponent(escape(atob(b64)));
      return str.split('').reverse().join('');
    } catch (e) { return ''; }
  }
  document.querySelectorAll('.contact-email[data-e]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var addr = decode(btn.getAttribute('data-e') || '');
      if (addr) window.location.href = 'mailto:' + addr;
    });
  });
})();
`;
