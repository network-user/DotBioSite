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

/**
 * Кодируем email безопасно для любого окружения.
 * btoa доступен в Node 18+ и во всех современных браузерах. Для не-ASCII
 * используем TextEncoder → байтовая строка → btoa, чтобы избежать
 * deprecated unescape() и не тянуть Node Buffer / @types/node.
 */
function encodeEmail(email: string): string {
  if (!email) return "";
  const reversed = email.split("").reverse().join("");
  const bytes = new TextEncoder().encode(reversed);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
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
      var bin = atob(b64);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var str = new TextDecoder('utf-8').decode(bytes);
      return str.split('').reverse().join('');
    } catch (e) { return ''; }
  }

  function buildMailto(addr, btn) {
    var params = new URLSearchParams();
    var subject = btn.getAttribute('data-subject') || '';
    var body = btn.getAttribute('data-body') || '';
    if (subject) params.set('subject', subject);
    if (body) params.set('body', body);
    var qs = params.toString();
    return 'mailto:' + addr + (qs ? '?' + qs : '');
  }

  function setCopied(btn) {
    var label = btn.querySelector('[data-contact-label]');
    if (!label) return;
    if (!btn.dataset.defaultLabel) btn.dataset.defaultLabel = label.textContent || '';
    label.textContent = btn.getAttribute('data-copied-label') || btn.dataset.defaultLabel;
    btn.classList.add('is-copied');
    window.setTimeout(function () {
      label.textContent = btn.dataset.defaultLabel || label.textContent;
      btn.classList.remove('is-copied');
    }, 1800);
  }

  function copyText(text, done) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () {});
      return;
    }
    var textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      done();
    } catch (e) {}
    document.body.removeChild(textarea);
  }

  document.querySelectorAll('.contact-email[data-e]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var addr = decode(btn.getAttribute('data-e') || '');
      if (!addr) return;
      if (btn.getAttribute('data-mode') === 'copy') {
        copyText(addr, function () { setCopied(btn); });
      } else {
        window.location.href = buildMailto(addr, btn);
      }
    });
  });
})();
`;
