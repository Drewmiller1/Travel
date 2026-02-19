import { supabase } from "./supabaseClient";

/**
 * NOTE: The DB uses "status" instead of "column" because "column" is
 * a reserved word in PostgreSQL. The mappers below translate between
 * DB rows (status) and app cards (column) automatically.
 *
 * All queries are automatically scoped to the logged-in user via
 * Supabase Row Level Security (RLS).
 */

/**
 * Get the current user's ID from the session.
 */
async function getUserId() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user?.id ?? null;
}

/* ── User Settings (board title / subtitle) ── */

export async function fetchUserSettings() {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .single();

  if (error && error.code === "PGRST116") {
    // No row found — create default
    const userId = await getUserId();
    if (!userId) return { board_title: "THE ADVENTURE LEDGER", board_subtitle: "Fortune & Glory Vacation Planner" };
    const { data: created, error: insertErr } = await supabase
      .from("user_settings")
      .insert({ user_id: userId })
      .select()
      .single();
    if (insertErr) throw insertErr;
    return created;
  }
  if (error) throw error;
  return data;
}

export async function updateUserSettings(updates) {
  const userId = await getUserId();
  if (!userId) throw new Error("Not logged in");

  const { data, error } = await supabase
    .from("user_settings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/* ── Expeditions CRUD ── */

export async function fetchExpeditions() {
  const { data, error } = await supabase
    .from("expeditions")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data || []).map(rowToCard);
}

export async function createExpedition(card) {
  const userId = await getUserId();
  const row = cardToRow(card, userId);
  const { data, error } = await supabase
    .from("expeditions")
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return rowToCard(data);
}

export async function updateExpedition(id, updates) {
  const row = cardToRow({ id, ...updates });
  delete row.created_at;
  delete row.user_id; // Don't update user_id

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
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
  };
}

function cardToRow(card, userId) {
  const row = {
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
    latitude: card.latitude ?? null,
    longitude: card.longitude ?? null,
  };
  if (userId) row.user_id = userId;
  return row;
}
