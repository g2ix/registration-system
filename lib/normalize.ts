/**
 * Normalize a string for fuzzy / accent-insensitive search.
 * Maps common Filipino/Spanish diacritics to their ASCII base:
 *   ñ → n, á → a, é → e, í → i, ó → o, ú → u, ü → u
 * Works bidirectionally — normalization is applied to BOTH the search
 * query and the stored value before comparison, so searching "nye"
 * matches "ñe" and vice-versa.
 */
export function normalizeForSearch(s: string): string {
    return s
        .normalize('NFD')                   // decompose combined chars (e.g. ñ → n + combining tilde)
        .replace(/[\u0300-\u036f]/g, '')    // strip all combining diacritical marks
        .toLowerCase()
        .trim()
}

/**
 * Returns both the original query and its normalized form (deduplicated).
 * Use both as LIKE patterns so the user can type either ñ or n and find results.
 */
export function queryVariants(q: string): string[] {
    const norm = normalizeForSearch(q)
    const variants: string[] = [q.trim()]
    if (norm !== q.trim().toLowerCase()) variants.push(norm)
    return variants
}
