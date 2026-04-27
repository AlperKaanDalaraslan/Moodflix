import byGroup from 'unicode-emoji-json/data-by-group.json';

/** @type {{ emoji: string, name: string, slug: string, group: string }[] | null} */
let cached = null;

/**
 * Unicode veri setindeki tüm emoji satırları (yüzler, hayvanlar, semboller … binlerce).
 */
export function getEmojiAvatarRecords() {
  if (cached) {
    return cached;
  }
  const out = [];
  for (const g of byGroup) {
    const groupName = typeof g?.name === 'string' ? g.name : '';
    for (const row of g?.emojis ?? []) {
      if (row && typeof row.emoji === 'string' && row.emoji) {
        out.push({
          emoji: row.emoji,
          name: typeof row.name === 'string' ? row.name : '',
          slug: typeof row.slug === 'string' ? row.slug : '',
          group: groupName,
        });
      }
    }
  }
  cached = out;
  return out;
}

/**
 * @param {{ emoji: string, name: string, slug: string, group: string }[]} records
 * @param {string} query
 */
export function filterEmojiAvatarRecords(records, query) {
  const q = String(query ?? '')
    .trim()
    .toLowerCase();
  if (!q) {
    return records;
  }
  const underscored = q.replace(/\s+/g, '_');
  return records.filter(r => {
    const name = r.name.toLowerCase();
    const slug = r.slug;
    return (
      name.includes(q) ||
      slug.includes(underscored) ||
      slug.includes(q) ||
      r.emoji === query.trim() ||
      r.group.toLowerCase().includes(q)
    );
  });
}
