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
  { id: "dreams", title: "DREAM DESTINATIONS", shortTitle: "DREAMS", icon: "\u{1F5FA}\uFE0F", subtitle: "Uncharted Territory" },
  { id: "planning", title: "EXPEDITION PLANNING", shortTitle: "PLANNING", icon: "\u{1F4DC}", subtitle: "Mapping the Route" },
  { id: "booked", title: "TICKETS SECURED", shortTitle: "BOOKED", icon: "\u2708\uFE0F", subtitle: "Ready for Takeoff" },
  { id: "completed", title: "CONQUERED", shortTitle: "CONQUERED", icon: "\u{1F3C6}", subtitle: "Tales of Glory" },
];

const CONTINENTS = [
  { id: "north_america", name: "North America", icon: "\u{1F985}", color: "#7a3b10" },
  { id: "south_america", name: "South America", icon: "\u{1F99C}", color: "#2d5a1e" },
  { id: "europe", name: "Europe", icon: "\u{1F3F0}", color: "#5a2d78" },
  { id: "africa", name: "Africa", icon: "\u{1F981}", color: "#8a6508" },
  { id: "asia", name: "Asia", icon: "\u{1F409}", color: "#9a3508" },
  { id: "oceania", name: "Oceania", icon: "\u{1F428}", color: "#0e5565" },
  { id: "antarctica", name: "Antarctica", icon: "\u{1F427}", color: "#2a4f5e" },
];
const CONT_MAP = Object.fromEntries(CONTINENTS.map(c => [c.id, c]));

const TAG_COLORS = {
  adventure: "#7a5a08", historical: "#5c4010", trek: "#2a5a18", ruins: "#6e3a18",
  "road trip": "#3e5510", nature: "#1a5a38", food: "#922e08", culture: "#5a2878",
  zen: "#1e4a58", beach: "#0a5262", wildlife: "#4a4010",
};
const getTagColor = (tag) => TAG_COLORS[tag] || "#5c4010";

/* Responsive hook */
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

export default function VacationPlanner({ user, onSignOut }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saveStatus, setSaveStatus] = useState("saved");
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

  /* Mobile state */
  const isMobile = useIsMobile();
  const [mobileActiveCol, setMobileActiveCol] = useState("dreams");
  const [touchDrag, setTouchDrag] = useState(null);
  const [swipeCard, setSwipeCard] = useState(null);
  const touchRef = useRef(null);

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
        const newCard = { id: tempId, column: formData.column, continent: formData.continent, title: formData.title, description: formData.description, image: "\u{1F5FA}\uFE0F", budget: formData.budget, dates: formData.dates, tags: tagArray, rating: formData.rating, sort_order: cards.length };
        setAnimatingCards(prev => new Set([...prev, tempId]));
        setCards(prev => [...prev, newCard]);
        setTimeout(() => setAnimatingCards(prev => { const n = new Set(prev); n.delete(tempId); return n; }), 500);
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

  const handleDelete = async (id) => {
    setCards(prev => prev.filter(c => c.id !== id));
    setExpandedCard(null);
    setSaveStatus("saving");
    try { await deleteExpedition(id); setSaveStatus("saved"); }
    catch (err) { console.error("Failed to delete:", err); setSaveStatus("error"); }
  };

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
        const result = [...without]; result.splice(insertAt, 0, updated);
        saveReorder(result); return result;
      } else { const result = [...without, updated]; saveReorder(result); return result; }
    });
  }, [saveReorder]);

  /* Desktop drag */
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

  /* Mobile touch swipe */
  const getAdjacentColumn = (currentCol, direction) => {
    const idx = COLUMNS.findIndex(c => c.id === currentCol);
    if (direction === "left" && idx < COLUMNS.length - 1) return COLUMNS[idx + 1].id;
    if (direction === "right" && idx > 0) return COLUMNS[idx - 1].id;
    return null;
  };

  const handleTouchStart = useCallback((e, card) => {
    const touch = e.touches[0];
    touchRef.current = { card, startX: touch.clientX, startY: touch.clientY, moved: false, decided: false };
  }, []);

  const handleTouchMove = useCallback((e, card) => {
    const state = touchRef.current;
    if (!state || state.card.id !== card.id) return;
    const touch = e.touches[0];
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;
    if (!state.decided && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      state.decided = true;
      state.isHorizontal = Math.abs(dx) > Math.abs(dy);
    }
    if (state.decided && !state.isHorizontal) return;
    if (state.decided && state.isHorizontal && Math.abs(dx) > 15) {
      state.moved = true;
      e.preventDefault();
      const direction = dx < 0 ? "left" : "right";
      setTouchDrag({ card, dx, direction, targetCol: getAdjacentColumn(card.column, direction) });
    }
  }, []);

  const handleTouchEnd = useCallback((e, card) => {
    const state = touchRef.current;
    if (!state || state.card.id !== card.id) { touchRef.current = null; return; }
    touchRef.current = null;
    if (!state.moved) { setTouchDrag(null); return; }
    const touch = e.changedTouches[0];
    const dx = touch.clientX - state.startX;
    const threshold = Math.min(80, window.innerWidth * 0.25);
    if (Math.abs(dx) > threshold) {
      const direction = dx < 0 ? "left" : "right";
      const targetCol = getAdjacentColumn(card.column, direction);
      if (targetCol) {
        setSwipeCard({ id: card.id, direction, targetCol });
        setTouchDrag(null);
        setTimeout(() => { moveCardToColumn(card.id, targetCol); setSwipeCard(null); }, 280);
        return;
      }
    }
    setTouchDrag(null);
  }, []);

  const moveCardToColumn = useCallback((cardId, newColumn) => {
    setSaveStatus("saving");
    setCards(prev => { const result = prev.map(c => c.id === cardId ? { ...c, column: newColumn } : c); saveReorder(result); return result; });
  }, [saveReorder]);

  const renderStars = (rating, interactive = false, onChange = null) => (
    <div style={{ display: "flex", gap: "3px" }}>
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star} onClick={interactive ? () => onChange(star) : undefined}
          style={{ cursor: interactive ? "pointer" : "default", fontSize: interactive ? "22px" : "14px", color: star <= (rating || 0) ? "#9a6d00" : "#c8bda0", textShadow: star <= (rating || 0) ? "0 0 3px rgba(154,109,0,0.25)" : "none", transition: "all 0.2s" }}>{"\u2605"}</span>
      ))}
    </div>
  );

  const stats = {
    dreams: cards.filter(c => c.column === "dreams").length,
    planning: cards.filter(c => c.column === "planning").length,
    booked: cards.filter(c => c.column === "booked").length,
    completed: cards.filter(c => c.column === "completed").length,
  };

  const DropIndicator = () => (
    <div style={{ height: "3px", borderRadius: "2px", margin: "2px 0", background: "linear-gradient(90deg, transparent 0%, #8a6508 20%, #8a6508 80%, transparent 100%)", boxShadow: "0 0 6px rgba(138,101,8,0.4)", animation: "pulseBar 1s ease-in-out infinite" }} />
  );

  const SaveIndicator = () => {
    const styles = {
      saved: { color: "#2d5a1e", bg: "rgba(45,90,30,0.08)", border: "rgba(45,90,30,0.2)", text: "\u2713 Saved" },
      saving: { color: "#8a6508", bg: "rgba(138,101,8,0.08)", border: "rgba(138,101,8,0.2)", text: "\u27F3 Saving..." },
      error: { color: "#8a1a1a", bg: "rgba(138,26,26,0.08)", border: "rgba(138,26,26,0.2)", text: "\u2717 Error" },
    };
    const s = styles[saveStatus];
    return (<div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "3px 10px", borderRadius: "4px", background: s.bg, border: `1px solid ${s.border}`, fontSize: "10px", fontWeight: "600", color: s.color, letterSpacing: "0.5px", transition: "all 0.3s" }}>{s.text}</div>);
  };

  const SwipeOverlay = ({ direction, targetCol }) => {
    const col = COLUMNS.find(c => c.id === targetCol);
    if (!col) return null;
    const isLeft = direction === "left";
    return (
      <div style={{ position: "absolute", top: 0, bottom: 0, [isLeft ? "right" : "left"]: 0, width: "50%", display: "flex", alignItems: "center", justifyContent: isLeft ? "flex-end" : "flex-start", padding: "0 12px", background: isLeft ? "linear-gradient(to left, rgba(154,109,0,0.2), transparent)" : "linear-gradient(to right, rgba(154,109,0,0.2), transparent)", borderRadius: "8px", zIndex: 5, pointerEvents: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontWeight: "700", color: "#5a4000", letterSpacing: "1px", textTransform: "uppercase", background: "rgba(255,253,245,0.92)", padding: "4px 8px", borderRadius: "4px", border: "1px solid rgba(154,109,0,0.3)" }}>
          {!isLeft && <span>{"\u2190"}</span>}
          <span>{col.icon}</span>
          <span>{col.shortTitle}</span>
          {isLeft && <span>{"\u2192"}</span>}
        </div>
      </div>
    );
  };

  const renderCard = (card, showRegion, colId, contId) => {
    const cont = CONT_MAP[card.continent];
    const isDropBefore = dropTarget?.cardId === card.id && dropTarget?.position === "before" && draggedCard?.id !== card.id;
    const isDropAfter = dropTarget?.cardId === card.id && dropTarget?.position === "after" && draggedCard?.id !== card.id;
    const isSwipingAway = swipeCard?.id === card.id;
    const swipeDir = swipeCard?.direction;
    const isTouchDragging = touchDrag?.card?.id === card.id;
    const touchDx = isTouchDragging ? touchDrag.dx : 0;

    return (
      <div key={card.id}>
        {isDropBefore && <DropIndicator />}
        <div
          draggable={!isMobile}
          onDragStart={!isMobile ? () => handleDragStart(card) : undefined}
          onDragEnd={!isMobile ? handleDragEnd : undefined}
          onDragOver={!isMobile ? (e) => handleCardDragOver(e, card) : undefined}
          onDrop={!isMobile ? (e) => handleCardDrop(e, card, colId, contId) : undefined}
          onTouchStart={isMobile ? (e) => handleTouchStart(e, card) : undefined}
          onTouchMove={isMobile ? (e) => handleTouchMove(e, card) : undefined}
          onTouchEnd={isMobile ? (e) => handleTouchEnd(e, card) : undefined}
          onClick={() => setExpandedCard(expandedCard?.id === card.id ? null : card)}
          style={{
            background: "linear-gradient(135deg, #fffdf5 0%, #f7f0dc 100%)",
            border: draggedCard?.id === card.id ? "1px dashed rgba(138,101,8,0.4)" : "1px solid rgba(120,90,20,0.18)",
            borderRadius: "8px", padding: isMobile ? "12px" : "11px",
            cursor: isMobile ? "default" : "grab",
            transition: isSwipingAway ? "transform 0.28s ease, opacity 0.28s ease" : (isTouchDragging ? "none" : "border 0.2s, opacity 0.2s, box-shadow 0.2s"),
            opacity: draggedCard?.id === card.id ? 0.35 : (isSwipingAway ? 0 : 1),
            transform: isSwipingAway ? `translateX(${swipeDir === "left" ? "-110%" : "110%"})` : (isTouchDragging ? `translateX(${touchDx}px) rotate(${touchDx * 0.02}deg)` : "none"),
            animation: animatingCards.has(card.id) ? "slideIn 0.4s ease-out" : "none",
            position: "relative", overflow: "hidden",
            boxShadow: isTouchDragging ? "0 6px 24px rgba(100,80,20,0.2)" : "0 1px 4px rgba(100,80,20,0.08)",
            WebkitUserSelect: "none", userSelect: "none", touchAction: "pan-y",
          }}
          onMouseEnter={!isMobile ? (e) => { if (!draggedCard) { e.currentTarget.style.border = "1px solid rgba(120,90,20,0.35)"; e.currentTarget.style.boxShadow = "0 3px 12px rgba(100,80,20,0.12)"; }} : undefined}
          onMouseLeave={!isMobile ? (e) => { if (!draggedCard) { e.currentTarget.style.border = "1px solid rgba(120,90,20,0.18)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(100,80,20,0.08)"; }} : undefined}
        >
          {isTouchDragging && touchDrag.targetCol && <SwipeOverlay direction={touchDrag.direction} targetCol={touchDrag.targetCol} />}
          {showRegion && cont && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", marginBottom: "7px", padding: "3px 8px", borderRadius: "4px", background: `${cont.color}10`, border: `1px solid ${cont.color}30`, borderLeft: `3px solid ${cont.color}70` }}>
              <span style={{ fontSize: "12px" }}>{cont.icon}</span>
              <span style={{ fontSize: "10px", fontWeight: "700", color: cont.color, letterSpacing: "1px", textTransform: "uppercase" }}>{cont.name}</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "flex-start", gap: "9px" }}>
            <span style={{ fontSize: "22px", lineHeight: 1 }}>{card.image}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: isMobile ? "15px" : "14px", color: "#2e2410", fontFamily: "'Georgia', serif", fontWeight: "bold", lineHeight: 1.3 }}>{card.title}</h3>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#4a3d28", lineHeight: 1.5, display: expandedCard?.id === card.id ? "block" : "-webkit-box", WebkitLineClamp: expandedCard?.id === card.id ? "unset" : 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{card.description}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px", marginTop: "7px", flexWrap: "wrap", alignItems: "center" }}>
            {card.budget && <span style={{ fontSize: "11px", fontWeight: "600", padding: "2px 7px", borderRadius: "4px", background: "rgba(154,109,0,0.1)", color: "#6a4e00", border: "1px solid rgba(154,109,0,0.2)" }}>{"\u{1F4B0}"} {card.budget}</span>}
            {card.dates && <span style={{ fontSize: "11px", fontWeight: "600", padding: "2px 7px", borderRadius: "4px", background: "rgba(110,58,24,0.08)", color: "#5e3010", border: "1px solid rgba(110,58,24,0.18)" }}>{"\u{1F4C5}"} {card.dates}</span>}
          </div>
          {card.tags.length > 0 && (
            <div style={{ display: "flex", gap: "4px", marginTop: "5px", flexWrap: "wrap" }}>
              {card.tags.map(tag => (
                <span key={tag} style={{ fontSize: "10px", fontWeight: "700", padding: "2px 6px", borderRadius: "3px", background: `${getTagColor(tag)}14`, color: getTagColor(tag), border: `1px solid ${getTagColor(tag)}35`, letterSpacing: "0.5px", textTransform: "uppercase" }}>{tag}</span>
              ))}
            </div>
          )}
          {card.column === "completed" && card.rating && <div style={{ marginTop: "5px" }}>{renderStars(card.rating)}</div>}
          {expandedCard?.id === card.id && isMobile && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed rgba(120,90,20,0.12)", fontSize: "10px", color: "#8a7a58", letterSpacing: "0.5px" }}>
              {"\u2190"} Swipe to change status {"\u2192"}
            </div>
          )}
          {expandedCard?.id === card.id && (
            <div style={{ display: "flex", gap: "6px", marginTop: "9px", paddingTop: "9px", borderTop: "1px solid rgba(120,90,20,0.12)" }}>
              <button onClick={(e) => { e.stopPropagation(); openEditModal(card); }}
                style={{ flex: 1, padding: isMobile ? "10px" : "6px", fontSize: "11px", fontWeight: "600", background: "rgba(154,109,0,0.1)", border: "1px solid rgba(154,109,0,0.25)", borderRadius: "5px", color: "#5a4000", cursor: "pointer", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace" }}>{"\u270F\uFE0F"} Edit</button>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(card.id); }}
                style={{ flex: 1, padding: isMobile ? "10px" : "6px", fontSize: "11px", fontWeight: "600", background: "rgba(160,30,30,0.08)", border: "1px solid rgba(160,30,30,0.25)", borderRadius: "5px", color: "#8a1a1a", cursor: "pointer", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace" }}>{"\u{1F5D1}\uFE0F"} Delete</button>
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

  /* === MOBILE VIEW === */
  const renderMobileView = () => {
    const col = COLUMNS.find(c => c.id === mobileActiveCol);
    const colCards = cards.filter(c => c.column === mobileActiveCol);
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 56px)" }}>
        <div style={{ display: "flex", position: "sticky", top: 56, zIndex: 15, background: "rgba(239,228,200,0.97)", backdropFilter: "blur(4px)", borderBottom: "2px solid rgba(100,80,20,0.15)" }}>
          {COLUMNS.map(c => {
            const count = cards.filter(card => card.column === c.id).length;
            const isActive = mobileActiveCol === c.id;
            return (
              <button key={c.id} onClick={() => setMobileActiveCol(c.id)}
                style={{ flex: 1, padding: "10px 4px", border: "none", borderBottom: isActive ? "3px solid #8a6508" : "3px solid transparent", background: isActive ? "rgba(154,109,0,0.08)" : "transparent", cursor: "pointer", transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                  <span style={{ fontSize: "13px" }}>{c.icon}</span>
                  <span style={{ fontSize: "9px", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase", color: isActive ? "#3d2a08" : "#8a7a58", fontFamily: "'Georgia', serif" }}>{c.shortTitle}</span>
                </div>
                <span style={{ fontSize: "10px", fontWeight: "700", color: isActive ? "#8a6508" : "#a09880", background: isActive ? "rgba(154,109,0,0.1)" : "rgba(100,80,20,0.06)", borderRadius: "8px", padding: "1px 6px", minWidth: "18px" }}>{count}</span>
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "12px 12px 100px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {colCards.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#8a7a58" }}>
              <div style={{ fontSize: "36px", marginBottom: "12px", opacity: 0.5 }}>{col.icon}</div>
              <div style={{ fontSize: "13px", fontWeight: "600", letterSpacing: "1px", marginBottom: "4px" }}>No {col.shortTitle.toLowerCase()} yet</div>
              <div style={{ fontSize: "11px", color: "#a09880" }}>Tap + to add an expedition</div>
            </div>
          )}
          {colCards.map(card => renderCard(card, true, mobileActiveCol, card.continent))}
        </div>
        <button onClick={() => openAddModal(mobileActiveCol, "north_america")}
          style={{ position: "fixed", bottom: "24px", right: "20px", zIndex: 30, width: "56px", height: "56px", borderRadius: "50%", background: "linear-gradient(135deg, #8a6508 0%, #6a4e00 100%)", border: "2px solid rgba(255,253,245,0.3)", color: "#fdfaf0", fontSize: "28px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(100,80,20,0.3), 0 2px 4px rgba(0,0,0,0.1)", lineHeight: 1 }}>+</button>
      </div>
    );
  };

  /* === DESKTOP FLAT VIEW === */
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

  /* === DESKTOP SWIMLANE VIEW === */
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
                  <span style={{ marginLeft: "auto", fontSize: "11px", color: "#5a4828", fontWeight: "bold", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>{"\u25BC"}</span>
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
                  {contCards.length > 0 ? `${contCards.length} expedition${contCards.length !== 1 ? "s" : ""} \u2014 click to expand` : "No expeditions yet \u2014 click to expand"}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(175deg, #f5eed6 0%, #e8dfc2 100%)", fontFamily: "'Georgia', serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", animation: "float 2s ease-in-out infinite", marginBottom: "16px" }}>{"\u{1F3FA}"}</div>
          <div style={{ fontSize: "16px", color: "#7a5c1a", letterSpacing: "3px", textTransform: "uppercase" }}>Loading expeditions...</div>
        </div>
        <style>{`@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }`}</style>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(175deg, #f5eed6 0%, #e8dfc2 100%)", fontFamily: "'Courier New', monospace" }}>
        <div style={{ textAlign: "center", maxWidth: "440px", padding: "32px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>{"\u26A0\uFE0F"}</div>
          <h2 style={{ fontSize: "18px", color: "#8a1a1a", fontFamily: "'Georgia', serif", marginBottom: "12px" }}>CONNECTION FAILED</h2>
          <p style={{ fontSize: "13px", color: "#5a4828", lineHeight: 1.6, marginBottom: "16px" }}>{loadError}</p>
          <p style={{ fontSize: "11px", color: "#8a7a58", lineHeight: 1.5 }}>Check that your <code style={{ background: "rgba(100,80,20,0.08)", padding: "2px 6px", borderRadius: "3px" }}>.env</code> file has valid <code style={{ background: "rgba(100,80,20,0.08)", padding: "2px 6px", borderRadius: "3px" }}>VITE_SUPABASE_URL</code> and <code style={{ background: "rgba(100,80,20,0.08)", padding: "2px 6px", borderRadius: "3px" }}>VITE_SUPABASE_ANON_KEY</code> values.</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: "16px", padding: "10px 24px", background: "rgba(154,109,0,0.15)", border: "2px solid rgba(154,109,0,0.3)", borderRadius: "6px", color: "#3d2a08", cursor: "pointer", fontSize: "12px", fontWeight: "bold", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace" }}>{"\u26A1"} RETRY</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(175deg, #f5eed6 0%, #efe4c8 30%, #f0e8d0 60%, #e8dfc2 100%)", fontFamily: "'Courier New', monospace", color: "#2e2410", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: `radial-gradient(ellipse at 20% 50%, rgba(184,134,11,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(160,82,45,0.05) 0%, transparent 40%), radial-gradient(ellipse at 50% 80%, rgba(139,109,20,0.04) 0%, transparent 50%)` }} />
      {!isMobile && <div style={{ position: "fixed", bottom: "-100px", right: "-100px", width: "400px", height: "400px", opacity: 0.06, fontSize: "400px", pointerEvents: "none", zIndex: 0 }}>{"\u{1F9ED}"}</div>}

      <header style={{ position: "sticky", top: 0, zIndex: 20, padding: isMobile ? "10px 14px" : "18px 28px 14px", borderBottom: "2px solid rgba(100,80,20,0.22)", background: "linear-gradient(180deg, rgba(245,238,214,0.98) 0%, rgba(239,228,200,0.95) 100%)", backdropFilter: "blur(8px)" }}>
        {isMobile ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ fontSize: "24px" }}>{"\u{1F3FA}"}</div>
              <h1 style={{ margin: 0, fontSize: "16px", fontWeight: "bold", fontFamily: "'Georgia', serif", color: "#3d2a08", letterSpacing: "2px", textTransform: "uppercase" }}>ADVENTURE LEDGER</h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <SaveIndicator />
              <button onClick={async () => { await signOut(); onSignOut?.(); }}
                style={{ padding: "6px 10px", fontSize: "10px", fontWeight: "700", background: "rgba(138,26,26,0.06)", border: "1px solid rgba(138,26,26,0.2)", borderRadius: "5px", color: "#8a1a1a", cursor: "pointer", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace", whiteSpace: "nowrap" }}>{"\u{1F6AA}"}</button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ fontSize: "32px", filter: "drop-shadow(0 2px 4px rgba(100,80,20,0.2))", animation: "float 3s ease-in-out infinite" }}>{"\u{1F3FA}"}</div>
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
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "4px", paddingLeft: "16px", borderLeft: "1px solid rgba(100,80,20,0.15)" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#3d2a08", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email || "Explorer"}</div>
                  <div style={{ fontSize: "9px", color: "#8a7a58", letterSpacing: "1px", textTransform: "uppercase" }}>ADVENTURER</div>
                </div>
                <button onClick={async () => { await signOut(); onSignOut?.(); }}
                  style={{ padding: "6px 12px", fontSize: "10px", fontWeight: "700", background: "rgba(138,26,26,0.06)", border: "1px solid rgba(138,26,26,0.2)", borderRadius: "5px", color: "#8a1a1a", cursor: "pointer", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace", transition: "all 0.2s", whiteSpace: "nowrap" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(138,26,26,0.12)"; e.currentTarget.style.borderColor = "rgba(138,26,26,0.35)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(138,26,26,0.06)"; e.currentTarget.style.borderColor = "rgba(138,26,26,0.2)"; }}
                >{"\u{1F6AA}"} Sign Out</button>
              </div>
            </div>
          </div>
        )}
      </header>

      {isMobile ? renderMobileView() : (swimlanes ? renderSwimlaneView() : renderFlatView())}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(60,48,20,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? "0" : "20px", animation: "fadeIn 0.2s ease" }} onClick={() => setShowModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "linear-gradient(135deg, #fdfaf0 0%, #f2ebd4 100%)", border: "1px solid rgba(100,80,20,0.22)", borderRadius: isMobile ? "16px 16px 0 0" : "12px", padding: isMobile ? "24px 20px 32px" : "28px", width: "100%", maxWidth: isMobile ? "100%" : "480px", boxShadow: "0 24px 64px rgba(60,48,20,0.25)", animation: isMobile ? "slideUpModal 0.3s ease" : "slideUp 0.3s ease", maxHeight: isMobile ? "85vh" : "90vh", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
            {isMobile && <div style={{ width: "40px", height: "4px", borderRadius: "2px", background: "rgba(100,80,20,0.2)", margin: "0 auto 16px" }} />}
            <h2 style={{ margin: "0 0 20px", fontSize: isMobile ? "18px" : "20px", fontFamily: "'Georgia', serif", color: "#3d2a08", letterSpacing: "2px", textTransform: "uppercase" }}>{editCard ? "\u{1F4DC} EDIT EXPEDITION" : "\u{1F5FA}\uFE0F NEW EXPEDITION"}</h2>
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
                    style={{ width: "100%", padding: "10px", background: "rgba(255,253,245,0.8)", border: "1px solid rgba(100,80,20,0.2)", borderRadius: "6px", color: "#2e2410", fontFamily: "'Courier New', monospace", fontSize: isMobile ? "16px" : "14px", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
                ) : (
                  <input value={formData[field.key]} onChange={(e) => setFormData(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder}
                    style={{ width: "100%", padding: "10px", background: "rgba(255,253,245,0.8)", border: "1px solid rgba(100,80,20,0.2)", borderRadius: "6px", color: "#2e2410", fontFamily: "'Courier New', monospace", fontSize: isMobile ? "16px" : "14px", outline: "none", boxSizing: "border-box" }} />
                )}
              </div>
            ))}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#4a3a18", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px" }}>Region</label>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fill, minmax(125px, 1fr))", gap: "6px" }}>
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px" }}>
                {COLUMNS.map(col => (
                  <button key={col.id} onClick={() => setFormData(p => ({ ...p, column: col.id }))}
                    style={{ padding: "10px 6px", fontSize: "11px", fontWeight: "600", background: formData.column === col.id ? "rgba(154,109,0,0.12)" : "rgba(255,253,245,0.6)", border: formData.column === col.id ? "2px solid rgba(154,109,0,0.4)" : "1px solid rgba(100,80,20,0.12)", borderRadius: "6px", cursor: "pointer", color: formData.column === col.id ? "#4a3a08" : "#5a4828", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace", transition: "all 0.2s" }}>{col.icon} {col.shortTitle}</button>
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
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: isMobile ? "14px" : "11px", fontSize: "12px", fontWeight: "600", background: "transparent", border: "1px solid rgba(100,80,20,0.2)", borderRadius: "6px", color: "#5a4828", cursor: "pointer", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace" }}>RETREAT</button>
              <button onClick={saveCard} style={{ flex: 1, padding: isMobile ? "14px" : "11px", fontSize: "12px", fontWeight: "bold", background: "linear-gradient(135deg, rgba(154,109,0,0.18) 0%, rgba(120,85,10,0.18) 100%)", border: "2px solid rgba(154,109,0,0.35)", borderRadius: "6px", color: "#3d2a08", cursor: "pointer", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace" }}>{"\u26A1"} {editCard ? "UPDATE" : "EMBARK"}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-4px); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-10px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUpModal { from { opacity: 0; transform: translateY(100%); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseBar { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(100,80,20,0.18); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(100,80,20,0.28); }
        ::placeholder { color: #9a8a68 !important; }
        textarea:focus, input:focus { border-color: rgba(120,90,20,0.4) !important; box-shadow: 0 0 0 3px rgba(154,109,0,0.08); }
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
}
