/**
 * contacts.ts — обфускация email для контактных секций.
 *
 * Email НЕ отдаётся как plain-text mailto/строка — иначе его подберёт любой
 * наивный scraper. Стратегия:
 *   1) На этапе билда из AUTHOR_EMAIL (server-only переменная) получаем base64
 *      от ПЕРЕВЁРНУТОЙ строки.
 *   2) В HTML рендерится только эта строка в `data-e` атрибуте кнопки.
 *   3) Клиентский декодер (внешний бандл, см. `Contact.astro`) восстанавливает
 *      адрес на клик и открывает `mailto:` / копирует.
 *
 * Это защита от наивных скраперов, а не сокрытие: адрес тривиально восстановим
 * на клиенте, считать его фактически публичным.
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
