import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchExpeditions,
  createExpedition,
  updateExpedition,
  deleteExpedition,
  bulkUpdateOrder,
} from "./api";
import { signOut } from "./auth";

const COLUMNS = [
  { id: "dreams", title: "DREAM DESTINATIONS", icon: "🗺️", subtitle: "Uncharted Territory" },
  { id: "planning", title: "EXPEDITION PLANNING", icon: "📜", subtitle: "Mapping the Route" },
  { id: "booked", title: "TICKETS SECURED", icon: "✈️", subtitle: "Ready for Takeoff" },
  { id: "completed", title: "CONQUERED", icon: "🏆", subtitle: "Tales of Glory" },
];

const CONTINENTS = [
  { id: "north_america", name: "North America", icon: "🦅", color: "#7a3b10" },
  { id: "south_america", name: "South America", icon: "🦜", color: "#2d5a1e" },
  { id: "europe", name: "Europe", icon: "🏰", color: "#5a2d78" },
  { id: "africa", name: "Africa", icon: "🦁", color: "#8a6508" },
  { id: "asia", name: "Asia", icon: "🐉", color: "#9a3508" },
  { id: "oceania", name: "Oceania", icon: "🐨", color: "#0e5565" },
  { id: "antarctica", name: "Antarctica", icon: "🐧", color: "#2a4f5e" },
];
const CONT_MAP = Object.fromEntries(CONTINENTS.map(c => [c.id, c]));

const TAG_COLORS = {
  adventure: "#7a5a08", historical: "#5c4010", trek: "#2a5a18", ruins: "#6e3a18",
  "road trip": "#3e5510", nature: "#1a5a38", food: "#922e08", culture: "#5a2878",
  zen: "#1e4a58", beach: "#0a5262", wildlife: "#4a4010",
};
const getTagColor = (tag) => TAG_COLORS[tag] || "#5c4010";

export default function VacationPlanner({ user, onSignOut }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saveStatus, setSaveStatus] = useState("saved"); // saved | saving | error
  const [draggedCard, setDraggedCard] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [collapsedRows, setCollapsedRows] = useState(new Set());
  const [swimlanes, setSwimlanes] = useState(true);
  const [formData, setFormData] = useState({ title: "", description: "", budget: "", dates: "", tags: "", column: "dreams", continent: "north_america", rating: null });
  const [animatingCards, setAnimatingCards] = useState(new Set());
  const reorderTimeoutRef = useRef(null);

  /* ── Load from Supabase on mount ── */
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchExpeditions();
        setCards(data);
      } catch (err) {
        console.error("Failed to load expeditions:", err);
        setLoadError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Debounced bulk reorder save ── */
  const saveReorder = useCallback((updatedCards) => {
    if (reorderTimeoutRef.current) clearTimeout(reorderTimeoutRef.current);
    setSaveStatus("saving");
    reorderTimeoutRef.current = setTimeout(async () => {
      try {
        const updates = updatedCards.map((c, i) => ({
          id: c.id, sort_order: i, column: c.column, continent: c.continent,
        }));
        await bulkUpdateOrder(updates);
        setSaveStatus("saved");
      } catch (err) {
        console.error("Failed to save order:", err);
        setSaveStatus("error");
      }
    }, 800);
  }, []);

  const toggleRow = (continentId) => {
    setCollapsedRows(prev => { const n = new Set(prev); n.has(continentId) ? n.delete(continentId) : n.add(continentId); return n; });
  };

  const openAddModal = (columnId, continentId) => {
    setEditCard(null);
    setFormData({ title: "", description: "", budget: "", dates: "", tags: "", column: columnId, continent: continentId || "north_america", rating: null });
    setShowModal(true);
  };

  const openEditModal = (card) => {
    setEditCard(card);
    setFormData({ title: card.title, description: card.description, budget: card.budget, dates: card.dates, tags: card.tags.join(", "), column: card.column, continent: card.continent, rating: card.rating });
    setShowModal(true);
  };

  /* ── Save (create or update) ── */
  const saveCard = async () => {
    if (!formData.title.trim()) return;
    const tagArray = formData.tags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
    setSaveStatus("saving");

    try {
      if (editCard) {
        const updated = await updateExpedition(editCard.id, { ...formData, tags: tagArray });
        setCards(prev => prev.map(c => c.id === editCard.id ? { ...c, ...updated } : c));
      } else {
        const tempId = `temp-${Date.now()}`;
        const newCard = {
          id: tempId, column: formData.column, continent: formData.continent,
          title: formData.title, description: formData.description, image: "🗺️",
          budget: formData.budget, dates: formData.dates, tags: tagArray, rating: formData.rating,
          sort_order: cards.length,
        };
        // Optimistic: show immediately
        setAnimatingCards(prev => new Set([...prev, tempId]));
        setCards(prev => [...prev, newCard]);
        setTimeout(() => setAnimatingCards(prev => { const n = new Set(prev); n.delete(tempId); return n; }), 500);

        // Persist and replace temp id with real UUID
        const created = await createExpedition(newCard);
        setCards(prev => prev.map(c => c.id === tempId ? created : c));
      }
      setSaveStatus("saved");
    } catch (err) {
      console.error("Failed to save:", err);
      setSaveStatus("error");
    }
    setShowModal(false);
  };

  /* ── Delete ── */
  const handleDelete = async (id) => {
    setCards(prev => prev.filter(c => c.id !== id));
    setExpandedCard(null);
    setSaveStatus("saving");
    try {
      await deleteExpedition(id);
      setSaveStatus("saved");
    } catch (err) {
      console.error("Failed to delete:", err);
      setSaveStatus("error");
    }
  };

  /* ── Reorder logic ── */
  const reorderCards = useCallback((dragId, targetCardId, position, newCol, newCont) => {
    setCards(prev => {
      const dragged = prev.find(c => c.id === dragId);
      if (!dragged) return prev;
      const without = prev.filter(c => c.id !== dragId);
      const updated = { ...dragged, column: newCol ?? dragged.column, continent: newCont ?? dragged.continent };
      if (targetCardId) {
        const idx = without.findIndex(c => c.id === targetCardId);
        if (idx === -1) return [...without, updated];
        const insertAt = position === "after" ? idx + 1 : idx;
        const result = [...without];
        result.splice(insertAt, 0, updated);
        saveReorder(result);
        return result;
      } else {
        const result = [...without, updated];
        saveReorder(result);
        return result;
      }
    });
  }, [saveReorder]);

  const handleDragStart = (card) => { setDraggedCard(card); setExpandedCard(null); };
  const handleDragEnd = () => { setDraggedCard(null); setDropTarget(null); };

  const handleCardDragOver = useCallback((e, card) => {
    e.preventDefault(); e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setDropTarget(prev => (prev?.cardId === card.id && prev?.position === pos) ? prev : { cardId: card.id, position: pos });
  }, []);

  const handleCardDrop = useCallback((e, card, newCol, newCont) => {
    e.preventDefault(); e.stopPropagation();
    if (!draggedCard || draggedCard.id === card.id) { setDraggedCard(null); setDropTarget(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    reorderCards(draggedCard.id, card.id, pos, newCol, newCont);
    setDraggedCard(null); setDropTarget(null);
  }, [draggedCard, reorderCards]);

  const handleZoneDragOver = useCallback((e, zoneId) => {
    e.preventDefault();
    setDropTarget(prev => prev?.zone === zoneId ? prev : { zone: zoneId, position: "end" });
  }, []);

  const handleZoneDropFlat = useCallback((e, colId) => {
    e.preventDefault();
    if (draggedCard) reorderCards(draggedCard.id, null, "end", colId, undefined);
    setDraggedCard(null); setDropTarget(null);
  }, [draggedCard, reorderCards]);

  const handleZoneDropCell = useCallback((e, colId, contId) => {
    e.preventDefault();
    if (draggedCard) reorderCards(draggedCard.id, null, "end", colId, contId);
    setDraggedCard(null); setDropTarget(null);
  }, [draggedCard, reorderCards]);

  const renderStars = (rating, interactive = false, onChange = null) => (
    <div style={{ display: "flex", gap: "3px" }}>
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star} onClick={interactive ? () => onChange(star) : undefined}
          style={{ cursor: interactive ? "pointer" : "default", fontSize: interactive ? "22px" : "14px", color: star <= (rating || 0) ? "#9a6d00" : "#c8bda0", textShadow: star <= (rating || 0) ? "0 0 3px rgba(154,109,0,0.25)" : "none", transition: "all 0.2s" }}>★</span>
      ))}
    </div>
  );

  const stats = {
    dreams: cards.filter(c => c.column === "dreams").length,
    planning: cards.filter(c => c.column === "planning").length,
    booked: cards.filter(c => c.column === "booked").length,
    completed: cards.filter(c => c.column === "completed").length,
  };

  /* ── Drop indicator bar ── */
  const DropIndicator = () => (
    <div style={{ height: "3px", borderRadius: "2px", margin: "2px 0", background: "linear-gradient(90deg, transparent 0%, #8a6508 20%, #8a6508 80%, transparent 100%)", boxShadow: "0 0 6px rgba(138,101,8,0.4)", animation: "pulseBar 1s ease-in-out infinite" }} />
  );

  /* ── Save status indicator ── */
  const SaveIndicator = () => {
    const styles = {
      saved: { color: "#2d5a1e", bg: "rgba(45,90,30,0.08)", border: "rgba(45,90,30,0.2)", text: "✓ Saved" },
      saving: { color: "#8a6508", bg: "rgba(138,101,8,0.08)", border: "rgba(138,101,8,0.2)", text: "⟳ Saving..." },
      error: { color: "#8a1a1a", bg: "rgba(138,26,26,0.08)", border: "rgba(138,26,26,0.2)", text: "✗ Error" },
    };
    const s = styles[saveStatus];
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: "5px", padding: "3px 10px",
        borderRadius: "4px", background: s.bg, border: `1px solid ${s.border}`,
        fontSize: "10px", fontWeight: "600", color: s.color, letterSpacing: "0.5px",
        transition: "all 0.3s",
      }}>{s.text}</div>
    );
  };

  const renderCard = (card, showRegion, colId, contId) => {
    const cont = CONT_MAP[card.continent];
    const isDropBefore = dropTarget?.cardId === card.id && dropTarget?.position === "before" && draggedCard?.id !== card.id;
    const isDropAfter = dropTarget?.cardId === card.id && dropTarget?.position === "after" && draggedCard?.id !== card.id;
    return (
      <div key={card.id}>
        {isDropBefore && <DropIndicator />}
        <div draggable onDragStart={() => handleDragStart(card)} onDragEnd={handleDragEnd}
          onDragOver={(e) => handleCardDragOver(e, card)} onDrop={(e) => handleCardDrop(e, card, colId, contId)}
          onClick={() => setExpandedCard(expandedCard?.id === card.id ? null : card)}
          style={{
            background: "linear-gradient(135deg, #fffdf5 0%, #f7f0dc 100%)",
            border: draggedCard?.id === card.id ? "1px dashed rgba(138,101,8,0.4)" : "1px solid rgba(120,90,20,0.18)",
            borderRadius: "8px", padding: "11px", cursor: "grab", transition: "border 0.2s, opacity 0.2s, box-shadow 0.2s",
            opacity: draggedCard?.id === card.id ? 0.35 : 1,
            animation: animatingCards.has(card.id) ? "slideIn 0.4s ease-out" : "none",
            position: "relative", overflow: "hidden", boxShadow: "0 1px 4px rgba(100,80,20,0.08)",
          }}
          onMouseEnter={(e) => { if (!draggedCard) { e.currentTarget.style.border = "1px solid rgba(120,90,20,0.35)"; e.currentTarget.style.boxShadow = "0 3px 12px rgba(100,80,20,0.12)"; }}}
          onMouseLeave={(e) => { if (!draggedCard) { e.currentTarget.style.border = "1px solid rgba(120,90,20,0.18)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(100,80,20,0.08)"; }}}
        >
          {showRegion && cont && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginBottom: "7px", padding: "3px 8px", borderRadius: "4px", background: `${cont.color}10`, border: `1px solid ${cont.color}30`, borderLeft: `3px solid ${cont.color}70` }}>
              <span style={{ fontSize: "12px" }}>{cont.icon}</span>
              <span style={{ fontSize: "10px", fontWeight: "700", color: cont.color, letterSpacing: "1px", textTransform: "uppercase" }}>{cont.name}</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "9px" }}>
            <span style={{ fontSize: "22px", lineHeight: 1 }}>{card.image}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: "14px", color: "#2e2410", fontFamily: "'Georgia', serif", fontWeight: "bold", lineHeight: 1.3 }}>{card.title}</h3>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#4a3d28", lineHeight: 1.5, display: expandedCard?.id === card.id ? "block" : "-webkit-box", WebkitLineClamp: expandedCard?.id === card.id ? "unset" : 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{card.description}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", marginTop: "7px", flexWrap: "wrap", alignItems: "center" }}>
            {card.budget && <span style={{ fontSize: "11px", fontWeight: "600", padding: "2px 7px", borderRadius: "4px", background: "rgba(154,109,0,0.1)", color: "#6a4e00", border: "1px solid rgba(154,109,0,0.2)" }}>💰 {card.budget}</span>}
            {card.dates && <span style={{ fontSize: "11px", fontWeight: "600", padding: "2px 7px", borderRadius: "4px", background: "rgba(110,58,24,0.08)", color: "#5e3010", border: "1px solid rgba(110,58,24,0.18)" }}>📅 {card.dates}</span>}
          </div>
          {card.tags.length > 0 && (
            <div style={{ display: "flex", gap: "4px", marginTop: "5px", flexWrap: "wrap" }}>
              {card.tags.map(tag => (
                <span key={tag} style={{ fontSize: "10px", fontWeight: "700", padding: "2px 6px", borderRadius: "3px", background: `${getTagColor(tag)}14`, color: getTagColor(tag), border: `1px solid ${getTagColor(tag)}35`, letterSpacing: "0.5px", textTransform: "uppercase" }}>{tag}</span>
              ))}
            </div>
          )}
          {card.column === "completed" && card.rating && <div style={{ marginTop: "5px" }}>{renderStars(card.rating)}</div>}
          {expandedCard?.id === card.id && (
            <div style={{ display: "flex", gap: "6px", marginTop: "9px", paddingTop: "9px", borderTop: "1px solid rgba(120,90,20,0.12)" }}>
              <button onClick={(e) => { e.stopPropagation(); openEditModal(card); }}
                style={{ flex: 1, padding: "6px", fontSize: "11px", fontWeight: "600", background: "rgba(154,109,0,0.1)", border: "1px solid rgba(154,109,0,0.25)", borderRadius: "5px", color: "#5a4000", cursor: "pointer", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace" }}>✏️ Edit</button>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(card.id); }}
                style={{ flex: 1, padding: "6px", fontSize: "11px", fontWeight: "600", background: "rgba(160,30,30,0.08)", border: "1px solid rgba(160,30,30,0.25)", borderRadius: "5px", color: "#8a1a1a", cursor: "pointer", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace" }}>🗑️ Delete</button>
            </div>
          )}
        </div>
        {isDropAfter && <DropIndicator />}
      </div>
    );
  };

  const ToggleSwitch = () => (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "11px", fontWeight: "600", color: swimlanes ? "#5a4828" : "#3d2a08", letterSpacing: "1px" }}>LIST</span>
      <div onClick={() => setSwimlanes(p => !p)} style={{ width: "44px", height: "24px", borderRadius: "12px", cursor: "pointer", background: swimlanes ? "linear-gradient(135deg, #8a6508 0%, #6a4e00 100%)" : "rgba(100,80,20,0.2)", border: swimlanes ? "1px solid #6a4e00" : "1px solid rgba(100,80,20,0.25)", position: "relative", transition: "all 0.3s ease", boxShadow: swimlanes ? "inset 0 1px 3px rgba(0,0,0,0.15)" : "inset 0 1px 2px rgba(0,0,0,0.08)" }}>
        <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: swimlanes ? "#fdfaf0" : "#e8dfc2", border: swimlanes ? "1px solid rgba(154,109,0,0.3)" : "1px solid rgba(100,80,20,0.2)", position: "absolute", top: "2px", left: swimlanes ? "22px" : "2px", transition: "all 0.3s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.15)" }} />
      </div>
      <span style={{ fontSize: "11px", fontWeight: "600", color: swimlanes ? "#3d2a08" : "#5a4828", letterSpacing: "1px" }}>REGIONS</span>
    </div>
  );

  /* ── Flat Column View ── */
  const renderFlatView = () => (
    <div style={{ display: "flex", gap: "16px", padding: "20px", overflowX: "auto", minHeight: "calc(100vh - 110px)" }}>
      {COLUMNS.map(col => {
        const colCards = cards.filter(c => c.column === col.id);
        const zoneId = `col-${col.id}`;
        const isZoneOver = dropTarget?.zone === zoneId;
        return (
          <div key={col.id} onDragOver={(e) => handleZoneDragOver(e, zoneId)} onDragLeave={() => setDropTarget(prev => prev?.zone === zoneId ? null : prev)} onDrop={(e) => handleZoneDropFlat(e, col.id)}
            style={{ flex: "1 0 260px", maxWidth: "360px", minWidth: "260px", background: isZoneOver ? "linear-gradient(180deg, rgba(154,109,0,0.08) 0%, rgba(245,238,214,0.6) 100%)" : "linear-gradient(180deg, rgba(240,232,208,0.5) 0%, rgba(232,223,194,0.35) 100%)", borderRadius: "12px", border: isZoneOver ? "1px solid rgba(120,90,20,0.3)" : "1px solid rgba(100,80,20,0.12)", transition: "all 0.3s ease", display: "flex", flexDirection: "column", boxShadow: "0 2px 8px rgba(100,80,20,0.06)" }}>
            <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid rgba(100,80,20,0.1)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <span style={{ fontSize: "16px" }}>{col.icon}</span>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "12px", fontWeight: "bold", letterSpacing: "1.5px", color: "#3d2a08", fontFamily: "'Georgia', serif" }}>{col.title}</h2>
                    <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#6a5530", fontWeight: "500", letterSpacing: "1px" }}>{col.subtitle}</p>
                  </div>
                </div>
                <span style={{ background: "rgba(154,109,0,0.1)", borderRadius: "50%", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: "#3d2a08", fontWeight: "bold" }}>{colCards.length}</span>
              </div>
            </div>
            <div style={{ flex: 1, padding: "8px", display: "flex", flexDirection: "column", gap: "6px", overflowY: "auto", maxHeight: "calc(100vh - 220px)" }}>
              {colCards.map(card => renderCard(card, true, col.id, card.continent))}
              {isZoneOver && colCards.length === 0 && <DropIndicator />}
              <button onClick={() => openAddModal(col.id, "north_america")}
                style={{ width: "100%", padding: "8px", background: "transparent", border: "1px dashed rgba(100,80,20,0.18)", borderRadius: "6px", color: "#8a7a58", cursor: "pointer", fontSize: "12px", fontWeight: "600", fontFamily: "'Courier New', monospace", transition: "all 0.3s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(120,90,20,0.4)"; e.currentTarget.style.color = "#4a3a18"; e.currentTarget.style.background = "rgba(154,109,0,0.04)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(100,80,20,0.18)"; e.currentTarget.style.color = "#8a7a58"; e.currentTarget.style.background = "transparent"; }}>+ NEW EXPEDITION</button>
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ── Swimlane Grid View ── */
  const renderSwimlaneView = () => (
    <div style={{ position: "relative", zIndex: 5, overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "170px repeat(4, minmax(220px, 1fr))", position: "sticky", top: 0, zIndex: 15, background: "rgba(239,228,200,0.97)", backdropFilter: "blur(4px)", borderBottom: "1px solid rgba(100,80,20,0.18)" }}>
        <div style={{ padding: "10px 14px", borderRight: "1px solid rgba(100,80,20,0.12)", display: "flex", alignItems: "center" }}><ToggleSwitch /></div>
        {COLUMNS.map(col => (
          <div key={col.id} style={{ padding: "10px 14px", borderRight: "1px solid rgba(100,80,20,0.08)", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
              <span style={{ fontSize: "15px" }}>{col.icon}</span>
              <span style={{ fontSize: "11px", fontWeight: "bold", letterSpacing: "1.5px", color: "#3d2a08", fontFamily: "'Georgia', serif" }}>{col.title}</span>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#6a5530", letterSpacing: "1px", fontWeight: "500" }}>{col.subtitle}</p>
          </div>
        ))}
      </div>
      {CONTINENTS.map(cont => {
        const contCards = cards.filter(c => c.continent === cont.id);
        const isCollapsed = collapsedRows.has(cont.id);
        return (
          <div key={cont.id}>
            <div style={{ display: "grid", gridTemplateColumns: "170px repeat(4, minmax(220px, 1fr))", borderBottom: "1px solid rgba(100,80,20,0.1)", minHeight: isCollapsed ? "auto" : undefined }}>
              <div onClick={() => toggleRow(cont.id)} style={{ padding: "12px 14px", cursor: "pointer", borderRight: "1px solid rgba(100,80,20,0.12)", background: `linear-gradient(135deg, ${cont.color}0a 0%, transparent 100%)`, borderLeft: `4px solid ${cont.color}60`, display: "flex", flexDirection: "column", justifyContent: "flex-start", position: "sticky", left: 0, zIndex: 10, transition: "all 0.2s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "22px" }}>{cont.icon}</span>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: "bold", color: cont.color, fontFamily: "'Georgia', serif", letterSpacing: "1px" }}>{cont.name.toUpperCase()}</div>
                    <div style={{ fontSize: "11px", color: "#5a4828", fontWeight: "500" }}>{contCards.length} expedition{contCards.length !== 1 ? "s" : ""}</div>
                  </div>
                  <span style={{ marginLeft: "auto", fontSize: "11px", color: "#5a4828", fontWeight: "bold", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
                </div>
              </div>
              {!isCollapsed && COLUMNS.map(col => {
                const cellCards = cards.filter(c => c.continent === cont.id && c.column === col.id);
                const zoneId = `cell-${cont.id}-${col.id}`;
                const isZoneOver = dropTarget?.zone === zoneId;
                return (
                  <div key={col.id} onDragOver={(e) => handleZoneDragOver(e, zoneId)} onDragLeave={() => setDropTarget(prev => prev?.zone === zoneId ? null : prev)} onDrop={(e) => handleZoneDropCell(e, col.id, cont.id)}
                    style={{ padding: "8px", borderRight: "1px solid rgba(100,80,20,0.06)", background: isZoneOver ? "rgba(154,109,0,0.07)" : "transparent", transition: "background 0.2s", minHeight: "80px", display: "flex", flexDirection: "column", gap: "6px" }}>
                    {cellCards.map(card => renderCard(card, false, col.id, cont.id))}
                    {isZoneOver && cellCards.length === 0 && <DropIndicator />}
                    <button onClick={() => openAddModal(col.id, cont.id)}
                      style={{ width: "100%", padding: "6px", marginTop: cellCards.length > 0 ? "2px" : "auto", background: "transparent", border: "1px dashed rgba(100,80,20,0.18)", borderRadius: "6px", color: "#8a7a58", cursor: "pointer", fontSize: "12px", fontWeight: "600", fontFamily: "'Courier New', monospace", transition: "all 0.3s" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(120,90,20,0.4)"; e.currentTarget.style.color = "#4a3a18"; e.currentTarget.style.background = "rgba(154,109,0,0.04)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(100,80,20,0.18)"; e.currentTarget.style.color = "#8a7a58"; e.currentTarget.style.background = "transparent"; }}>+</button>
                  </div>
                );
              })}
              {isCollapsed && (
                <div style={{ gridColumn: "span 4", padding: "10px 14px", display: "flex", alignItems: "center", color: "#6a5530", fontSize: "12px", fontStyle: "italic" }}>
                  {contCards.length > 0 ? `${contCards.length} expedition${contCards.length !== 1 ? "s" : ""} — click to expand` : "No expeditions yet — click to expand"}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  /* ── Loading screen ── */
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(175deg, #f5eed6 0%, #e8dfc2 100%)", fontFamily: "'Georgia', serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", animation: "float 2s ease-in-out infinite", marginBottom: "16px" }}>🏺</div>
          <div style={{ fontSize: "16px", color: "#7a5c1a", letterSpacing: "3px", textTransform: "uppercase" }}>Loading expeditions...</div>
        </div>
        <style>{`@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }`}</style>
      </div>
    );
  }

  /* ── Error screen ── */
  if (loadError) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(175deg, #f5eed6 0%, #e8dfc2 100%)", fontFamily: "'Courier New', monospace" }}>
        <div style={{ textAlign: "center", maxWidth: "440px", padding: "32px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h2 style={{ fontSize: "18px", color: "#8a1a1a", fontFamily: "'Georgia', serif", marginBottom: "12px" }}>CONNECTION FAILED</h2>
          <p style={{ fontSize: "13px", color: "#5a4828", lineHeight: 1.6, marginBottom: "16px" }}>{loadError}</p>
          <p style={{ fontSize: "11px", color: "#8a7a58", lineHeight: 1.5 }}>Check that your <code style={{ background: "rgba(100,80,20,0.08)", padding: "2px 6px", borderRadius: "3px" }}>.env</code> file has valid <code style={{ background: "rgba(100,80,20,0.08)", padding: "2px 6px", borderRadius: "3px" }}>VITE_SUPABASE_URL</code> and <code style={{ background: "rgba(100,80,20,0.08)", padding: "2px 6px", borderRadius: "3px" }}>VITE_SUPABASE_ANON_KEY</code> values.</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: "16px", padding: "10px 24px", background: "rgba(154,109,0,0.15)", border: "2px solid rgba(154,109,0,0.3)", borderRadius: "6px", color: "#3d2a08", cursor: "pointer", fontSize: "12px", fontWeight: "bold", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace" }}>⚡ RETRY</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(175deg, #f5eed6 0%, #efe4c8 30%, #f0e8d0 60%, #e8dfc2 100%)", fontFamily: "'Courier New', monospace", color: "#2e2410", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: `radial-gradient(ellipse at 20% 50%, rgba(184,134,11,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(160,82,45,0.05) 0%, transparent 40%), radial-gradient(ellipse at 50% 80%, rgba(139,109,20,0.04) 0%, transparent 50%)` }} />
      <div style={{ position: "fixed", bottom: "-100px", right: "-100px", width: "400px", height: "400px", opacity: 0.06, fontSize: "400px", pointerEvents: "none", zIndex: 0 }}>🧭</div>

      <header style={{ position: "sticky", top: 0, zIndex: 20, padding: "18px 28px 14px", borderBottom: "2px solid rgba(100,80,20,0.22)", background: "linear-gradient(180deg, rgba(245,238,214,0.98) 0%, rgba(239,228,200,0.95) 100%)", backdropFilter: "blur(8px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div style={{ fontSize: "32px", filter: "drop-shadow(0 2px 4px rgba(100,80,20,0.2))", animation: "float 3s ease-in-out infinite" }}>🏺</div>
            <div>
              <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "bold", fontFamily: "'Georgia', serif", color: "#3d2a08", textShadow: "0 1px 2px rgba(100,80,20,0.1)", letterSpacing: "3px", textTransform: "uppercase" }}>THE ADVENTURE LEDGER</h1>
              <p style={{ margin: "3px 0 0", fontSize: "12px", letterSpacing: "3px", color: "#6a5530", textTransform: "uppercase", fontWeight: "500" }}>Fortune & Glory Vacation Planner</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
            {!swimlanes && <ToggleSwitch />}
            <SaveIndicator />
            {[
              { label: "Dreaming", val: stats.dreams, color: "#8a6508" },
              { label: "Planning", val: stats.planning, color: "#6a5010" },
              { label: "Booked", val: stats.booked, color: "#1a6a3a" },
              { label: "Conquered", val: stats.completed, color: "#6e3a18" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "22px", fontWeight: "bold", color: s.color, fontFamily: "'Georgia', serif" }}>{s.val}</div>
                <div style={{ fontSize: "10px", fontWeight: "600", letterSpacing: "1.5px", color: "#5a4828", textTransform: "uppercase" }}>{s.label}</div>
              </div>
            ))}
            {/* User & Sign Out */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "4px", paddingLeft: "16px", borderLeft: "1px solid rgba(100,80,20,0.15)" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "11px", fontWeight: "600", color: "#3d2a08", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email || "Explorer"}</div>
                <div style={{ fontSize: "9px", color: "#8a7a58", letterSpacing: "1px", textTransform: "uppercase" }}>ADVENTURER</div>
              </div>
              <button onClick={async () => { await signOut(); onSignOut?.(); }}
                style={{
                  padding: "6px 12px", fontSize: "10px", fontWeight: "700",
                  background: "rgba(138,26,26,0.06)", border: "1px solid rgba(138,26,26,0.2)",
                  borderRadius: "5px", color: "#8a1a1a", cursor: "pointer",
                  letterSpacing: "1px", textTransform: "uppercase",
                  fontFamily: "'Courier New', monospace", transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(138,26,26,0.12)"; e.currentTarget.style.borderColor = "rgba(138,26,26,0.35)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(138,26,26,0.06)"; e.currentTarget.style.borderColor = "rgba(138,26,26,0.2)"; }}
              >🚪 Sign Out</button>
            </div>
          </div>
        </div>
      </header>

      {swimlanes ? renderSwimlaneView() : renderFlatView()}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(60,48,20,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", animation: "fadeIn 0.2s ease" }} onClick={() => setShowModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "linear-gradient(135deg, #fdfaf0 0%, #f2ebd4 100%)", border: "1px solid rgba(100,80,20,0.22)", borderRadius: "12px", padding: "28px", width: "100%", maxWidth: "480px", boxShadow: "0 24px 64px rgba(60,48,20,0.25)", animation: "slideUp 0.3s ease", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: "20px", fontFamily: "'Georgia', serif", color: "#3d2a08", letterSpacing: "2px", textTransform: "uppercase" }}>{editCard ? "📜 EDIT EXPEDITION" : "🗺️ NEW EXPEDITION"}</h2>
            {[
              { key: "title", label: "Destination", placeholder: "e.g. The Temple of Doom, India" },
              { key: "description", label: "Field Notes", placeholder: "Describe the adventure...", textarea: true },
              { key: "budget", label: "Treasure Required", placeholder: "e.g. $2,500" },
              { key: "dates", label: "Timeline", placeholder: "e.g. Mar 2026" },
              { key: "tags", label: "Classifications", placeholder: "e.g. adventure, ruins, danger" },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#4a3a18", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "5px" }}>{field.label}</label>
                {field.textarea ? (
                  <textarea value={formData[field.key]} onChange={(e) => setFormData(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder} rows={3}
                    style={{ width: "100%", padding: "10px", background: "rgba(255,253,245,0.8)", border: "1px solid rgba(100,80,20,0.2)", borderRadius: "6px", color: "#2e2410", fontFamily: "'Courier New', monospace", fontSize: "14px", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
                ) : (
                  <input value={formData[field.key]} onChange={(e) => setFormData(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder}
                    style={{ width: "100%", padding: "10px", background: "rgba(255,253,245,0.8)", border: "1px solid rgba(100,80,20,0.2)", borderRadius: "6px", color: "#2e2410", fontFamily: "'Courier New', monospace", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
                )}
              </div>
            ))}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#4a3a18", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px" }}>Region</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(125px, 1fr))", gap: "6px" }}>
                {CONTINENTS.map(cont => (
                  <button key={cont.id} onClick={() => setFormData(p => ({ ...p, continent: cont.id }))}
                    style={{ padding: "8px 8px", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", background: formData.continent === cont.id ? `${cont.color}1a` : "rgba(255,253,245,0.6)", border: formData.continent === cont.id ? `2px solid ${cont.color}70` : "1px solid rgba(100,80,20,0.12)", borderRadius: "6px", cursor: "pointer", color: formData.continent === cont.id ? cont.color : "#5a4828", fontFamily: "'Courier New', monospace", transition: "all 0.2s" }}>
                    <span>{cont.icon}</span> {cont.name}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#4a3a18", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px" }}>Status</label>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {COLUMNS.map(col => (
                  <button key={col.id} onClick={() => setFormData(p => ({ ...p, column: col.id }))}
                    style={{ flex: 1, padding: "8px 6px", fontSize: "11px", fontWeight: "600", background: formData.column === col.id ? "rgba(154,109,0,0.12)" : "rgba(255,253,245,0.6)", border: formData.column === col.id ? "2px solid rgba(154,109,0,0.4)" : "1px solid rgba(100,80,20,0.12)", borderRadius: "6px", cursor: "pointer", color: formData.column === col.id ? "#4a3a08" : "#5a4828", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace", transition: "all 0.2s", minWidth: "60px" }}>{col.icon} {col.id}</button>
                ))}
              </div>
            </div>
            {formData.column === "completed" && (
              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#4a3a18", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px" }}>Adventure Rating</label>
                {renderStars(formData.rating, true, (r) => setFormData(p => ({ ...p, rating: r })))}
              </div>
            )}
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "11px", fontSize: "12px", fontWeight: "600", background: "transparent", border: "1px solid rgba(100,80,20,0.2)", borderRadius: "6px", color: "#5a4828", cursor: "pointer", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace" }}>RETREAT</button>
              <button onClick={saveCard} style={{ flex: 1, padding: "11px", fontSize: "12px", fontWeight: "bold", background: "linear-gradient(135deg, rgba(154,109,0,0.18) 0%, rgba(120,85,10,0.18) 100%)", border: "2px solid rgba(154,109,0,0.35)", borderRadius: "6px", color: "#3d2a08", cursor: "pointer", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace" }}>⚡ {editCard ? "UPDATE" : "EMBARK"}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-4px); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-10px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseBar { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(100,80,20,0.18); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(100,80,20,0.28); }
        ::placeholder { color: #9a8a68 !important; }
        textarea:focus, input:focus { border-color: rgba(120,90,20,0.4) !important; box-shadow: 0 0 0 3px rgba(154,109,0,0.08); }
      `}</style>
    </div>
  );
}
