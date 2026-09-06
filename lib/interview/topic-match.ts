/** Match AI-returned topic names to persisted preparation topics. */

function normalizeTopicLabel(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export type MatchableTopic = {
  id: string;
  name: string;
  priority?: number | null;
};

export function matchTopicId(
  topicName: string | undefined,
  topics: MatchableTopic[],
  fallbackId?: string | null
): string | null {
  if (!topics.length) return fallbackId ?? null;
  const needle = normalizeTopicLabel(topicName ?? '');
  if (needle) {
    const exact = topics.find((t) => normalizeTopicLabel(t.name) === needle);
    if (exact) return exact.id;
    const partial = topics.find((t) => {
      const label = normalizeTopicLabel(t.name);
      return label.includes(needle) || needle.includes(label);
    });
    if (partial) return partial.id;
  }
  if (fallbackId && topics.some((t) => t.id === fallbackId)) return fallbackId;
  const sorted = [...topics].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  return sorted[0]?.id ?? null;
}
