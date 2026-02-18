import { supabase } from "./supabaseClient";

/**
 * Fetch all expeditions, ordered by sort_order then created_at.
 */
/**
 * NOTE: The DB uses "status" instead of "column" because "column" is
 * a reserved word in PostgreSQL. The mappers below translate between
 * DB rows (status) and app cards (column) automatically.
 */
export async function fetchExpeditions() {
  const { data, error } = await supabase
    .from("expeditions")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  // Map DB rows → app card shape
  return (data || []).map(rowToCard);
}

/**
 * Insert a new expedition. Returns the created card.
 */
export async function createExpedition(card) {
  const row = cardToRow(card);
  const { data, error } = await supabase
    .from("expeditions")
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return rowToCard(data);
}

/**
 * Update an existing expedition by id.
 */
export async function updateExpedition(id, updates) {
  const row = cardToRow({ id, ...updates });
  delete row.created_at;

  const { data, error } = await supabase
    .from("expeditions")
    .update(row)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return rowToCard(data);
}

/**
 * Delete an expedition by id.
 */
export async function deleteExpedition(id) {
  const { error } = await supabase
    .from("expeditions")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Bulk update sort_order for reordering.
 * Accepts array of { id, sort_order, column?, continent? }
 */
export async function bulkUpdateOrder(updates) {
  const results = await Promise.all(
    updates.map(({ id, sort_order, column, continent }) => {
      const patch = { sort_order };
      if (column !== undefined) patch.status = column; // column → status in DB
      if (continent !== undefined) patch.continent = continent;
      return supabase.from("expeditions").update(patch).eq("id", id);
    })
  );

  const firstError = results.find((r) => r.error);
  if (firstError?.error) throw firstError.error;
}

/* ── Row ↔ Card mappers ── */

function rowToCard(row) {
  return {
    id: row.id,
    column: row.status,        // DB "status" → app "column"
    continent: row.continent,
    title: row.title,
    description: row.description || "",
    image: row.image || "🗺️",
    budget: row.budget || "",
    dates: row.dates || "",
    tags: row.tags || [],
    rating: row.rating,
    sort_order: row.sort_order ?? 0,
  };
}

function cardToRow(card) {
  return {
    ...(card.id && !String(card.id).match(/^\d{13}$/) && !String(card.id).startsWith("temp-") ? { id: card.id } : {}),
    status: card.column,       // app "column" → DB "status"
    continent: card.continent,
    title: card.title,
    description: card.description || "",
    image: card.image || "🗺️",
    budget: card.budget || "",
    dates: card.dates || "",
    tags: card.tags || [],
    rating: card.rating || null,
    sort_order: card.sort_order ?? 0,
  };
}
