/**
 * Parser de RSS 2.0 / Atom sem dependência externa — regex-based, não uma
 * árvore DOM de verdade. Suficiente pro que os feeds de notícia cripto
 * usados aqui precisam (título, link, data, descrição) sem puxar um parser
 * XML completo só pra isso. Se um feed vier malformado, o item é descartado
 * silenciosamente em vez de derrubar o parse inteiro.
 */

export type RawFeedItem = {
  title: string;
  link: string;
  description: string;
  /** epoch ms, ou null se a data não veio ou não foi reconhecida. */
  publishedAt: number | null;
};

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "") // sobra de tag html dentro de description
    .trim();
}

function tag(block: string, name: string): string | null {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i").exec(block);
  return m ? decodeEntities(m[1]!) : null;
}

/** Atom usa `<link href="..."/>` (self-closing) em vez de `<link>url</link>`. */
function atomLink(block: string): string | null {
  const m = /<link\b[^>]*\brel=["']?alternate["']?[^>]*\bhref=["']([^"']+)["']/i.exec(block) ??
    /<link\b[^>]*\bhref=["']([^"']+)["']/i.exec(block);
  return m ? m[1]! : null;
}

function parseDate(raw: string | null): number | null {
  if (!raw) return null;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : null;
}

export function parseRssFeed(xml: string): RawFeedItem[] {
  const items: RawFeedItem[] = [];

  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  for (const block of itemBlocks) {
    const title = tag(block, "title");
    const link = tag(block, "link") ?? atomLink(block);
    if (!title || !link) continue;
    items.push({
      title,
      link,
      description: tag(block, "description") ?? "",
      publishedAt: parseDate(tag(block, "pubDate") ?? tag(block, "dc:date")),
    });
  }

  // Atom (entry-based) — só entra quando o feed não tinha <item> nenhum.
  if (items.length === 0) {
    const entryBlocks = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];
    for (const block of entryBlocks) {
      const title = tag(block, "title");
      const link = atomLink(block);
      if (!title || !link) continue;
      items.push({
        title,
        link,
        description: tag(block, "summary") ?? tag(block, "content") ?? "",
        publishedAt: parseDate(tag(block, "updated") ?? tag(block, "published")),
      });
    }
  }

  return items;
}
