import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchExpeditions,
  createExpedition,
  updateExpedition,
  deleteExpedition,
  bulkUpdateOrder,
  fetchUserSettings,
  updateUserSettings,
} from "./api";
import { signOut } from "./auth";

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth <= breakpoint
  );
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

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

/* ── Well-known locations for quick coordinate lookup ── */
const LOCATION_PRESETS = [
  { name: "Amsterdam, Netherlands", lat: 52.3676, lng: 4.9041 },
  { name: "Venice, Italy", lat: 45.4408, lng: 12.3155 },
  { name: "Florence, Italy", lat: 43.7696, lng: 11.2558 },
  { name: "Milan, Italy", lat: 45.4642, lng: 9.1900 },
  { name: "Naples, Italy", lat: 40.8518, lng: 14.2681 },
  { name: "Vienna, Austria", lat: 48.2082, lng: 16.3738 },
  { name: "Budapest, Hungary", lat: 47.4979, lng: 19.0402 },
  { name: "Berlin, Germany", lat: 52.5200, lng: 13.4050 },
  { name: "Munich, Germany", lat: 48.1351, lng: 11.5820 },
  { name: "Zurich, Switzerland", lat: 47.3769, lng: 8.5417 },
  { name: "Geneva, Switzerland", lat: 46.2044, lng: 6.1432 },
  { name: "Interlaken, Switzerland", lat: 46.6863, lng: 7.8632 },
  { name: "Brussels, Belgium", lat: 50.8503, lng: 4.3517 },
  { name: "Copenhagen, Denmark", lat: 55.6761, lng: 12.5683 },
  { name: "Stockholm, Sweden", lat: 59.3293, lng: 18.0686 },
  { name: "Oslo, Norway", lat: 59.9139, lng: 10.7522 },
  { name: "Helsinki, Finland", lat: 60.1699, lng: 24.9384 },
  { name: "Edinburgh, UK", lat: 55.9533, lng: -3.1883 },
  { name: "Dublin, Ireland", lat: 53.3498, lng: -6.2603 },
  { name: "Paris, France", lat: 48.8566, lng: 2.3522 },
  { name: "Tokyo, Japan", lat: 35.6762, lng: 139.6503 },
  { name: "New York, USA", lat: 40.7128, lng: -74.0060 },
  { name: "London, UK", lat: 51.5074, lng: -0.1278 },
  { name: "Rome, Italy", lat: 41.9028, lng: 12.4964 },
  { name: "Sydney, Australia", lat: -33.8688, lng: 151.2093 },
  { name: "Cairo, Egypt", lat: 30.0444, lng: 31.2357 },
  { name: "Rio de Janeiro, Brazil", lat: -22.9068, lng: -43.1729 },
  { name: "Cape Town, South Africa", lat: -33.9249, lng: 18.4241 },
  { name: "Machu Picchu, Peru", lat: -13.1631, lng: -72.5450 },
  { name: "Petra, Jordan", lat: 30.3285, lng: 35.4444 },
  { name: "Kyoto, Japan", lat: 35.0116, lng: 135.7681 },
  { name: "Barcelona, Spain", lat: 41.3874, lng: 2.1686 },
  { name: "Bangkok, Thailand", lat: 13.7563, lng: 100.5018 },
  { name: "Reykjavik, Iceland", lat: 64.1466, lng: -21.9426 },
  { name: "Istanbul, Turkey", lat: 41.0082, lng: 28.9784 },
  { name: "Marrakech, Morocco", lat: 31.6295, lng: -7.9811 },
  { name: "Buenos Aires, Argentina", lat: -34.6037, lng: -58.3816 },
  { name: "Dubai, UAE", lat: 25.2048, lng: 55.2708 },
  { name: "Cusco, Peru", lat: -13.5320, lng: -71.9675 },
  { name: "Athens, Greece", lat: 37.9838, lng: 23.7275 },
  { name: "Bali, Indonesia", lat: -8.3405, lng: 115.0920 },
  { name: "Grand Canyon, USA", lat: 36.1069, lng: -112.1129 },
  { name: "Serengeti, Tanzania", lat: -2.3333, lng: 34.8333 },
  { name: "Great Barrier Reef, Australia", lat: -18.2871, lng: 147.6992 },
  { name: "Santorini, Greece", lat: 36.3932, lng: 25.4615 },
  { name: "Angkor Wat, Cambodia", lat: 13.4125, lng: 103.8670 },
  { name: "Banff, Canada", lat: 51.1784, lng: -115.5708 },
  { name: "Queenstown, New Zealand", lat: -45.0312, lng: 168.6626 },
  { name: "Havana, Cuba", lat: 23.1136, lng: -82.3666 },
  { name: "Lisbon, Portugal", lat: 38.7223, lng: -9.1393 },
  { name: "Prague, Czech Republic", lat: 50.0755, lng: 14.4378 },
  { name: "Nairobi, Kenya", lat: -1.2921, lng: 36.8219 },
  { name: "Mexico City, Mexico", lat: 19.4326, lng: -99.1332 },
  { name: "Chiang Mai, Thailand", lat: 18.7883, lng: 98.9853 },
  { name: "Dubrovnik, Croatia", lat: 42.6507, lng: 18.0944 },
  { name: "Patagonia, Argentina", lat: -41.8101, lng: -68.9063 },
  { name: "Galápagos Islands, Ecuador", lat: -0.9538, lng: -90.9656 },
  { name: "Amalfi Coast, Italy", lat: 40.6340, lng: 14.6027 },
  { name: "Yellowstone, USA", lat: 44.4280, lng: -110.5885 },
];

/* ── Demo sample data (mirrors the DB seed for real users) ── */
const DEMO_CARDS = [
  { id: "demo-1", column: "dreams", continent: "asia", title: "Petra, Jordan", description: "Explore the ancient rose-red city carved into sandstone cliffs. Walk through the Siq canyon to discover the Treasury and countless tombs.", image: "🗺️", budget: "$2,500", dates: "Oct 2026", tags: ["adventure", "historical", "ruins"], rating: null, sort_order: 0, latitude: 30.3285, longitude: 35.4444 },
  { id: "demo-2", column: "dreams", continent: "south_america", title: "Machu Picchu, Peru", description: "Trek the Inca Trail to the legendary lost city in the clouds. Experience breathtaking mountain vistas and ancient engineering.", image: "🗺️", budget: "$3,200", dates: "Jul 2026", tags: ["trek", "ruins", "adventure"], rating: null, sort_order: 1, latitude: -13.1631, longitude: -72.5450 },
  { id: "demo-3", column: "planning", continent: "europe", title: "Iceland Ring Road", description: "Drive the famous Route 1 around the entire island. Witness waterfalls, glaciers, volcanic landscapes, and the northern lights.", image: "🗺️", budget: "$4,000", dates: "Feb 2027", tags: ["road trip", "nature", "adventure"], rating: null, sort_order: 2, latitude: 64.1466, longitude: -21.9426 },
  { id: "demo-4", column: "completed", continent: "europe", title: "Rome, Italy", description: "Wandered through millennia of history — the Colosseum, Vatican, Pantheon, and endless gelato. La dolce vita at its finest.", image: "🗺️", budget: "$2,800", dates: "May 2025", tags: ["historical", "food", "culture"], rating: 5, sort_order: 3, latitude: 41.9028, longitude: 12.4964 },
  { id: "demo-5", column: "completed", continent: "asia", title: "Kyoto, Japan", description: "Discovered serene temples, bamboo groves, and the art of tea ceremony. A perfect blend of tradition and tranquility.", image: "🗺️", budget: "$3,500", dates: "Apr 2025", tags: ["culture", "zen", "food"], rating: 4, sort_order: 4, latitude: 35.0116, longitude: 135.7681 },
  { id: "demo-6", column: "dreams", continent: "africa", title: "Serengeti Safari, Tanzania", description: "Witness the great migration — millions of wildebeest and zebra crossing the vast plains, alongside lions, elephants, and cheetahs.", image: "🗺️", budget: "$5,000", dates: "Aug 2026", tags: ["wildlife", "nature", "adventure"], rating: null, sort_order: 5, latitude: -2.3333, longitude: 34.8333 },
  { id: "demo-7", column: "dreams", continent: "oceania", title: "Great Barrier Reef, Australia", description: "Dive into the world's largest coral reef system. Snorkel with sea turtles, manta rays, and thousands of species of tropical fish.", image: "🗺️", budget: "$3,800", dates: "Nov 2026", tags: ["beach", "nature", "adventure"], rating: null, sort_order: 6, latitude: -18.2871, longitude: 147.6992 },
  { id: "demo-8", column: "planning", continent: "north_america", title: "Grand Canyon, USA", description: "Hike rim-to-rim through one of the natural wonders of the world. Layers of red rock reveal millions of years of geological history.", image: "🗺️", budget: "$1,500", dates: "Mar 2026", tags: ["trek", "nature"], rating: null, sort_order: 7, latitude: 36.1069, longitude: -112.1129 },
];

export default function VacationPlanner({ user, onSignOut, demoMode = false }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saveStatus, setSaveStatus] = useState("saved"); // saved | saving | error
  const [draggedCard, setDraggedCard] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editCard, setEditCard] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [formData, setFormData] = useState({ title: "", description: "", budget: "", dates: "", tags: "", column: "dreams", continent: "north_america", rating: null, latitude: "", longitude: "" });
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("dreams");
  const [animatingCards, setAnimatingCards] = useState(new Set());
  const reorderTimeoutRef = useRef(null);

  /* ── Editable board title / subtitle ── */
  const [boardTitle, setBoardTitle] = useState("THE ADVENTURE LEDGER");
  const [boardSubtitle, setBoardSubtitle] = useState("Fortune & Glory Vacation Planner");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingSubtitle, setEditingSubtitle] = useState(false);
  const titleInputRef = useRef(null);
  const subtitleInputRef = useRef(null);
  const titleSaveTimeout = useRef(null);

  /* ── Location search state ── */
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState([]);

  /* ── Load from Supabase on mount (or demo data) ── */
  useEffect(() => {
    if (demoMode) {
      setCards(DEMO_CARDS.map(c => ({ ...c })));
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [data, settings] = await Promise.all([
          fetchExpeditions(),
          fetchUserSettings(),
        ]);
        setCards(data);
        if (settings?.board_title) setBoardTitle(settings.board_title);
        if (settings?.board_subtitle) setBoardSubtitle(settings.board_subtitle);
      } catch (err) {
        console.error("Failed to load expeditions:", err);
        setLoadError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    })();
  }, [demoMode]);

  /* ── Focus input when editing title/subtitle ── */
  useEffect(() => {
    if (editingTitle && titleInputRef.current) titleInputRef.current.focus();
  }, [editingTitle]);
  useEffect(() => {
    if (editingSubtitle && subtitleInputRef.current) subtitleInputRef.current.focus();
  }, [editingSubtitle]);

  /* ── Debounced save for title/subtitle ── */
  const saveBoardSettings = useCallback((title, subtitle) => {
    if (demoMode) return; // Demo mode: edits work locally but don't persist
    if (titleSaveTimeout.current) clearTimeout(titleSaveTimeout.current);
    setSaveStatus("saving");
    titleSaveTimeout.current = setTimeout(async () => {
      try {
        await updateUserSettings({ board_title: title, board_subtitle: subtitle });
        setSaveStatus("saved");
      } catch (err) {
        console.error("Failed to save settings:", err);
        setSaveStatus("error");
      }
    }, 800);
  }, [demoMode]);

  const handleTitleBlur = () => {
    setEditingTitle(false);
    const val = boardTitle.trim() || "THE ADVENTURE LEDGER";
    setBoardTitle(val);
    saveBoardSettings(val, boardSubtitle);
  };

  const handleSubtitleBlur = () => {
    setEditingSubtitle(false);
    const val = boardSubtitle.trim() || "Fortune & Glory Vacation Planner";
    setBoardSubtitle(val);
    saveBoardSettings(boardTitle, val);
  };

  /* ── Debounced bulk reorder save ── */
  const saveReorder = useCallback((updatedCards) => {
    if (demoMode) return; // Demo mode: reorder works locally but doesn't persist
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
  }, [demoMode]);

  const openAddModal = (columnId) => {
    setEditCard(null);
    setFormData({ title: "", description: "", budget: "", dates: "", tags: "", column: columnId, continent: "north_america", rating: null, latitude: "", longitude: "" });
    setLocationQuery("");
    setLocationResults([]);
    setShowModal(true);
  };

  const openEditModal = (card) => {
    setEditCard(card);
    setFormData({
      title: card.title, description: card.description, budget: card.budget,
      dates: card.dates, tags: card.tags.join(", "), column: card.column,
      continent: card.continent, rating: card.rating,
      latitude: card.latitude ?? "", longitude: card.longitude ?? "",
    });
    setLocationQuery("");
    setLocationResults([]);
    setShowModal(true);
  };

  /* ── Location search against presets ── */
  const handleLocationSearch = (query) => {
    setLocationQuery(query);
    if (!query.trim()) {
      setLocationResults([]);
      return;
    }
    const q = query.toLowerCase();
    const matches = LOCATION_PRESETS.filter(loc =>
      loc.name.toLowerCase().includes(q)
    ).slice(0, 8);
    setLocationResults(matches);
  };

  const selectLocation = (loc) => {
    setFormData(p => ({ ...p, latitude: loc.lat, longitude: loc.lng }));
    setLocationQuery(loc.name);
    setLocationResults([]);
  };

  /* ── Save (create or update) ── */
  const saveCard = async () => {
    if (!formData.title.trim()) return;
    const tagArray = formData.tags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
    const lat = formData.latitude === "" ? null : parseFloat(formData.latitude);
    const lng = formData.longitude === "" ? null : parseFloat(formData.longitude);

    if (demoMode) {
      // Demo mode: all changes are in-memory only
      if (editCard) {
        setCards(prev => prev.map(c => c.id === editCard.id ? { ...c, ...formData, tags: tagArray, latitude: lat, longitude: lng } : c));
      } else {
        const newId = `demo-${Date.now()}`;
        const newCard = {
          id: newId, column: formData.column, continent: formData.continent,
          title: formData.title, description: formData.description, image: "🗺️",
          budget: formData.budget, dates: formData.dates, tags: tagArray, rating: formData.rating,
          sort_order: cards.length, latitude: lat, longitude: lng,
        };
        setAnimatingCards(prev => new Set([...prev, newId]));
        setCards(prev => [...prev, newCard]);
        setTimeout(() => setAnimatingCards(prev => { const n = new Set(prev); n.delete(newId); return n; }), 500);
      }
      setShowModal(false);
      return;
    }

    setSaveStatus("saving");

    try {
      if (editCard) {
        const updated = await updateExpedition(editCard.id, { ...formData, tags: tagArray, latitude: lat, longitude: lng });
        setCards(prev => prev.map(c => c.id === editCard.id ? { ...c, ...updated } : c));
      } else {
        const tempId = `temp-${Date.now()}`;
        const newCard = {
          id: tempId, column: formData.column, continent: formData.continent,
          title: formData.title, description: formData.description, image: "🗺️",
          budget: formData.budget, dates: formData.dates, tags: tagArray, rating: formData.rating,
          sort_order: cards.length, latitude: lat, longitude: lng,
        };
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

  /* ── Delete ── */
  const handleDelete = async (id) => {
    setCards(prev => prev.filter(c => c.id !== id));
    setExpandedCard(null);
    if (demoMode) return; // Demo mode: delete locally only
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
  const reorderCards = useCallback((dragId, targetCardId, position, newCol) => {
    setCards(prev => {
      const dragged = prev.find(c => c.id === dragId);
      if (!dragged) return prev;
      const without = prev.filter(c => c.id !== dragId);
      const updated = { ...dragged, column: newCol ?? dragged.column };
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

  const handleCardDrop = useCallback((e, card, newCol) => {
    e.preventDefault(); e.stopPropagation();
    if (!draggedCard || draggedCard.id === card.id) { setDraggedCard(null); setDropTarget(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? "before" : "after";
    reorderCards(draggedCard.id, card.id, pos, newCol);
    setDraggedCard(null); setDropTarget(null);
  }, [draggedCard, reorderCards]);

  const handleZoneDragOver = useCallback((e, zoneId) => {
    e.preventDefault();
    setDropTarget(prev => prev?.zone === zoneId ? prev : { zone: zoneId, position: "end" });
  }, []);

  const handleZoneDropFlat = useCallback((e, colId) => {
    e.preventDefault();
    if (draggedCard) reorderCards(draggedCard.id, null, "end", colId);
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

  const renderCard = (card, colId) => {
    const cont = CONT_MAP[card.continent];
    const isDropBefore = dropTarget?.cardId === card.id && dropTarget?.position === "before" && draggedCard?.id !== card.id;
    const isDropAfter = dropTarget?.cardId === card.id && dropTarget?.position === "after" && draggedCard?.id !== card.id;
    const hasCoords = card.latitude != null && card.longitude != null;
    return (
      <div key={card.id}>
        {isDropBefore && <DropIndicator />}
        <div draggable onDragStart={() => handleDragStart(card)} onDragEnd={handleDragEnd}
          onDragOver={(e) => handleCardDragOver(e, card)} onDrop={(e) => handleCardDrop(e, card, colId)}
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
          {cont && (
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
            {hasCoords && <span style={{ fontSize: "11px", fontWeight: "600", padding: "2px 7px", borderRadius: "4px", background: "rgba(14,85,101,0.08)", color: "#0e5565", border: "1px solid rgba(14,85,101,0.18)" }}>📍 {card.latitude.toFixed(2)}, {card.longitude.toFixed(2)}</span>}
          </div>
          {card.tags.length > 0 && (
            <div style={{ display: "flex", gap: "4px", marginTop: "5px", flexWrap: "wrap" }}>
              {card.tags.map(tag => (
                <span key={tag} style={{ fontSize: "10px", fontWeight: "700", padding: "2px 6px", borderRadius: "3px", background: `${getTagColor(tag)}14`, color: getTagColor(tag), border: `1px solid ${getTagColor(tag)}35`, letterSpacing: "0.5px", textTransform: "uppercase" }}>{tag}</span>
              ))}
            </div>
          )}
          {card.column === "completed" && card.rating && <div style={{ marginTop: "5px" }}>{renderStars(card.rating)}</div>}
          {(expandedCard?.id === card.id || isMobile) && (
            <div style={{ display: "flex", gap: "6px", marginTop: "9px", paddingTop: "9px", borderTop: "1px solid rgba(120,90,20,0.12)" }}>
              <button onClick={(e) => { e.stopPropagation(); openEditModal(card); }}
                style={{ flex: 1, padding: isMobile ? "10px" : "6px", fontSize: isMobile ? "13px" : "11px", fontWeight: "600", background: "rgba(154,109,0,0.1)", border: "1px solid rgba(154,109,0,0.25)", borderRadius: "5px", color: "#5a4000", cursor: "pointer", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace", minHeight: isMobile ? "44px" : "auto" }}>✏️ Edit</button>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(card.id); }}
                style={{ flex: 1, padding: isMobile ? "10px" : "6px", fontSize: isMobile ? "13px" : "11px", fontWeight: "600", background: "rgba(160,30,30,0.08)", border: "1px solid rgba(160,30,30,0.25)", borderRadius: "5px", color: "#8a1a1a", cursor: "pointer", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace", minHeight: isMobile ? "44px" : "auto" }}>🗑️ Delete</button>
            </div>
          )}
        </div>
        {isDropAfter && <DropIndicator />}
      </div>
    );
  };

  /* ── Flat Column View (only view now) ── */
  const renderListView = () => {
    if (isMobile) {
      const activeCol = COLUMNS.find(c => c.id === activeTab);
      const colCards = cards.filter(c => c.column === activeTab);
      const zoneId = `col-${activeTab}`;
      const isZoneOver = dropTarget?.zone === zoneId;
      return (
        <div style={{ padding: "0" }}
          onDragOver={(e) => handleZoneDragOver(e, zoneId)}
          onDragLeave={() => setDropTarget(prev => prev?.zone === zoneId ? null : prev)}
          onDrop={(e) => handleZoneDropFlat(e, activeTab)}>
          <div style={{ padding: "12px 16px 24px" }}>
            {activeCol && (
              <div style={{ padding: "10px 0 8px", marginBottom: "4px" }}>
                <h2 style={{ margin: 0, fontSize: "13px", fontWeight: "bold", letterSpacing: "1.5px", color: "#3d2a08", fontFamily: "'Georgia', serif" }}>{activeCol.title}</h2>
                <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#6a5530", fontWeight: "500", letterSpacing: "1px" }}>{activeCol.subtitle}</p>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {colCards.map(card => renderCard(card, activeTab))}
              {isZoneOver && colCards.length === 0 && <DropIndicator />}
              <button onClick={() => openAddModal(activeTab)}
                style={{ width: "100%", padding: "14px", background: "transparent", border: "1px dashed rgba(100,80,20,0.18)", borderRadius: "6px", color: "#8a7a58", cursor: "pointer", fontSize: "13px", fontWeight: "600", fontFamily: "'Courier New', monospace", transition: "all 0.3s", minHeight: "48px" }}>
                + NEW EXPEDITION
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
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
                {colCards.map(card => renderCard(card, col.id))}
                {isZoneOver && colCards.length === 0 && <DropIndicator />}
                <button onClick={() => openAddModal(col.id)}
                  style={{ width: "100%", padding: "8px", background: "transparent", border: "1px dashed rgba(100,80,20,0.18)", borderRadius: "6px", color: "#8a7a58", cursor: "pointer", fontSize: "12px", fontWeight: "600", fontFamily: "'Courier New', monospace", transition: "all 0.3s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(120,90,20,0.4)"; e.currentTarget.style.color = "#4a3a18"; e.currentTarget.style.background = "rgba(154,109,0,0.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(100,80,20,0.18)"; e.currentTarget.style.color = "#8a7a58"; e.currentTarget.style.background = "transparent"; }}>+ NEW EXPEDITION</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

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

      <header style={{ position: "sticky", top: 0, zIndex: 20, padding: isMobile ? "10px 16px 0" : "18px 28px 14px", borderBottom: "2px solid rgba(100,80,20,0.22)", background: "linear-gradient(180deg, rgba(245,238,214,0.98) 0%, rgba(239,228,200,0.95) 100%)", backdropFilter: "blur(8px)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: isMobile ? "8px" : "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "10px" : "14px", minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: isMobile ? "24px" : "32px", filter: "drop-shadow(0 2px 4px rgba(100,80,20,0.2))", animation: "float 3s ease-in-out infinite", flexShrink: 0 }}>🏺</div>
            <div style={{ minWidth: 0 }}>
              {editingTitle ? (
                <input
                  ref={titleInputRef}
                  value={boardTitle}
                  onChange={(e) => setBoardTitle(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                  style={{
                    margin: 0, fontSize: isMobile ? "15px" : "24px", fontWeight: "bold", fontFamily: "'Georgia', serif",
                    color: "#3d2a08", letterSpacing: isMobile ? "1px" : "3px", textTransform: "uppercase",
                    background: "rgba(255,253,245,0.8)", border: "1px solid rgba(120,90,20,0.3)",
                    borderRadius: "4px", padding: "2px 8px", outline: "none", width: "100%",
                    maxWidth: isMobile ? "200px" : "500px",
                  }}
                />
              ) : (
                <h1
                  onClick={() => setEditingTitle(true)}
                  title="Click to edit"
                  style={{
                    margin: 0, fontSize: isMobile ? "15px" : "24px", fontWeight: "bold", fontFamily: "'Georgia', serif",
                    color: "#3d2a08", textShadow: "0 1px 2px rgba(100,80,20,0.1)", letterSpacing: isMobile ? "1px" : "3px",
                    textTransform: "uppercase", cursor: "pointer", borderBottom: "1px dashed transparent",
                    transition: "border-color 0.2s", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = "rgba(100,80,20,0.3)"}
                  onMouseLeave={(e) => e.currentTarget.style.borderBottomColor = "transparent"}
                >{boardTitle}</h1>
              )}
              {!isMobile && (
                editingSubtitle ? (
                  <input
                    ref={subtitleInputRef}
                    value={boardSubtitle}
                    onChange={(e) => setBoardSubtitle(e.target.value)}
                    onBlur={handleSubtitleBlur}
                    onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); }}
                    style={{
                      margin: "3px 0 0", fontSize: "12px", letterSpacing: "3px", color: "#6a5530",
                      textTransform: "uppercase", fontWeight: "500",
                      background: "rgba(255,253,245,0.8)", border: "1px solid rgba(120,90,20,0.3)",
                      borderRadius: "4px", padding: "2px 8px", outline: "none", width: "100%",
                      maxWidth: "400px", fontFamily: "'Courier New', monospace",
                    }}
                  />
                ) : (
                  <p
                    onClick={() => setEditingSubtitle(true)}
                    title="Click to edit"
                    style={{
                      margin: "3px 0 0", fontSize: "12px", letterSpacing: "3px", color: "#6a5530",
                      textTransform: "uppercase", fontWeight: "500", cursor: "pointer",
                      borderBottom: "1px dashed transparent", transition: "border-color 0.2s",
                      display: "inline-block",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderBottomColor = "rgba(100,80,20,0.3)"}
                    onMouseLeave={(e) => e.currentTarget.style.borderBottomColor = "transparent"}
                  >{boardSubtitle}</p>
                )
              )}
            </div>
          </div>
          {isMobile ? (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
              {!demoMode && <SaveIndicator />}
              {demoMode ? (
                <button onClick={() => onSignOut?.()}
                  style={{ padding: "8px 12px", fontSize: "11px", fontWeight: "700", background: "linear-gradient(135deg, rgba(154,109,0,0.15) 0%, rgba(120,85,10,0.15) 100%)", border: "2px solid rgba(154,109,0,0.35)", borderRadius: "5px", color: "#3d2a08", cursor: "pointer", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace", whiteSpace: "nowrap", minHeight: "44px" }}>
                  📜 Sign Up</button>
              ) : (
                <button onClick={async () => { await signOut(); onSignOut?.(); }}
                  style={{ padding: "8px 12px", fontSize: "13px", fontWeight: "700", background: "rgba(138,26,26,0.06)", border: "1px solid rgba(138,26,26,0.2)", borderRadius: "5px", color: "#8a1a1a", cursor: "pointer", fontFamily: "'Courier New', monospace", whiteSpace: "nowrap", minHeight: "44px", minWidth: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  🚪</button>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
              {!demoMode && <SaveIndicator />}
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
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#3d2a08", maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{demoMode ? "Demo Explorer" : (user?.email || "Explorer")}</div>
                  <div style={{ fontSize: "9px", color: "#8a7a58", letterSpacing: "1px", textTransform: "uppercase" }}>{demoMode ? "DEMO MODE" : "ADVENTURER"}</div>
                </div>
                {demoMode ? (
                  <button onClick={() => onSignOut?.()}
                    style={{ padding: "6px 12px", fontSize: "10px", fontWeight: "700", background: "linear-gradient(135deg, rgba(154,109,0,0.15) 0%, rgba(120,85,10,0.15) 100%)", border: "2px solid rgba(154,109,0,0.35)", borderRadius: "5px", color: "#3d2a08", cursor: "pointer", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace", transition: "all 0.2s", whiteSpace: "nowrap" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(154,109,0,0.25) 0%, rgba(120,85,10,0.25) 100%)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(154,109,0,0.15) 0%, rgba(120,85,10,0.15) 100%)"; }}
                  >📜 Sign Up</button>
                ) : (
                  <button onClick={async () => { await signOut(); onSignOut?.(); }}
                    style={{ padding: "6px 12px", fontSize: "10px", fontWeight: "700", background: "rgba(138,26,26,0.06)", border: "1px solid rgba(138,26,26,0.2)", borderRadius: "5px", color: "#8a1a1a", cursor: "pointer", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace", transition: "all 0.2s", whiteSpace: "nowrap" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(138,26,26,0.12)"; e.currentTarget.style.borderColor = "rgba(138,26,26,0.35)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(138,26,26,0.06)"; e.currentTarget.style.borderColor = "rgba(138,26,26,0.2)"; }}
                  >🚪 Sign Out</button>
                )}
              </div>
            </div>
          )}
        </div>
        {/* ── Mobile Tab Bar (column navigation) ── */}
        {isMobile && (
          <div style={{ display: "flex", marginTop: "8px", borderTop: "1px solid rgba(100,80,20,0.1)" }}>
            {COLUMNS.map(col => {
              const count = cards.filter(c => c.column === col.id).length;
              const isActive = activeTab === col.id;
              return (
                <button key={col.id} onClick={() => setActiveTab(col.id)}
                  style={{
                    flex: 1, padding: "8px 4px 6px", display: "flex", flexDirection: "column", alignItems: "center", gap: "1px",
                    background: "transparent", border: "none", borderBottom: isActive ? "2px solid #8a6508" : "2px solid transparent",
                    cursor: "pointer", transition: "all 0.2s", opacity: isActive ? 1 : 0.5,
                  }}>
                  <span style={{ fontSize: "16px", lineHeight: 1 }}>{col.icon}</span>
                  <span style={{ fontSize: "8px", fontWeight: "700", letterSpacing: "0.5px", color: isActive ? "#3d2a08" : "#6a5530", textTransform: "uppercase", fontFamily: "'Courier New', monospace", lineHeight: 1.2 }}>
                    {col.id === "dreams" ? "Dreams" : col.id === "planning" ? "Plan" : col.id === "booked" ? "Booked" : "Done"} ({count})
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {demoMode && (
        <div style={{
          padding: isMobile ? "8px 16px" : "8px 28px", background: "linear-gradient(90deg, rgba(154,109,0,0.12) 0%, rgba(120,85,10,0.08) 100%)",
          borderBottom: "1px solid rgba(154,109,0,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? "6px" : "10px",
          fontSize: isMobile ? "11px" : "12px", color: "#5a4000", fontWeight: "600", letterSpacing: "0.5px",
          flexWrap: "wrap",
        }}>
          <span>🧭</span>
          <span>{isMobile ? "Demo mode — changes won't be saved." : "You're exploring in demo mode — changes are temporary and won't be saved."}</span>
          <button onClick={() => onSignOut?.()}
            style={{
              padding: isMobile ? "6px 12px" : "4px 12px", fontSize: "10px", fontWeight: "700",
              background: "rgba(154,109,0,0.12)", border: "1px solid rgba(154,109,0,0.3)",
              borderRadius: "4px", color: "#3d2a08", cursor: "pointer",
              letterSpacing: "1px", textTransform: "uppercase",
              fontFamily: "'Courier New', monospace", minHeight: isMobile ? "36px" : "auto",
            }}
          >Create Account</button>
        </div>
      )}

      {renderListView()}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(60,48,20,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center", padding: isMobile ? "0" : "20px", animation: "fadeIn 0.2s ease" }} onClick={() => setShowModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "linear-gradient(135deg, #fdfaf0 0%, #f2ebd4 100%)", border: "1px solid rgba(100,80,20,0.22)", borderRadius: isMobile ? "16px 16px 0 0" : "12px", padding: isMobile ? "20px 16px" : "28px", width: "100%", maxWidth: isMobile ? "100%" : "480px", boxShadow: "0 24px 64px rgba(60,48,20,0.25)", animation: isMobile ? "slideUpModal 0.3s ease" : "slideUp 0.3s ease", maxHeight: isMobile ? "92vh" : "90vh", overflowY: "auto" }}>
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

            {/* ── Location / Coordinates ── */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#4a3a18", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "5px" }}>📍 Location Coordinates</label>
              <div style={{ position: "relative", marginBottom: "8px" }}>
                <input
                  value={locationQuery}
                  onChange={(e) => handleLocationSearch(e.target.value)}
                  placeholder="Search a place (e.g. Paris, Machu Picchu)..."
                  style={{ width: "100%", padding: "10px", paddingLeft: "32px", background: "rgba(255,253,245,0.8)", border: "1px solid rgba(100,80,20,0.2)", borderRadius: "6px", color: "#2e2410", fontFamily: "'Courier New', monospace", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                />
                <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", pointerEvents: "none" }}>🔍</span>
                {locationResults.length > 0 && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
                    background: "#fdfaf0", border: "1px solid rgba(100,80,20,0.2)",
                    borderRadius: "0 0 6px 6px", boxShadow: "0 8px 24px rgba(60,48,20,0.15)",
                    maxHeight: "200px", overflowY: "auto",
                  }}>
                    {locationResults.map((loc, i) => (
                      <div
                        key={i}
                        onClick={() => selectLocation(loc)}
                        style={{
                          padding: "8px 12px", cursor: "pointer", fontSize: "13px",
                          color: "#2e2410", borderBottom: "1px solid rgba(100,80,20,0.08)",
                          transition: "background 0.15s", fontFamily: "'Courier New', monospace",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(154,109,0,0.08)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        <span>{loc.name}</span>
                        <span style={{ fontSize: "10px", color: "#8a7a58" }}>{loc.lat.toFixed(2)}, {loc.lng.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: "600", color: "#5a4828", letterSpacing: "1px", marginBottom: "3px" }}>LATITUDE</label>
                  <input
                    type="number" step="any"
                    value={formData.latitude}
                    onChange={(e) => setFormData(p => ({ ...p, latitude: e.target.value }))}
                    placeholder="-90 to 90"
                    style={{ width: "100%", padding: "8px", background: "rgba(255,253,245,0.8)", border: "1px solid rgba(100,80,20,0.2)", borderRadius: "6px", color: "#2e2410", fontFamily: "'Courier New', monospace", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "10px", fontWeight: "600", color: "#5a4828", letterSpacing: "1px", marginBottom: "3px" }}>LONGITUDE</label>
                  <input
                    type="number" step="any"
                    value={formData.longitude}
                    onChange={(e) => setFormData(p => ({ ...p, longitude: e.target.value }))}
                    placeholder="-180 to 180"
                    style={{ width: "100%", padding: "8px", background: "rgba(255,253,245,0.8)", border: "1px solid rgba(100,80,20,0.2)", borderRadius: "6px", color: "#2e2410", fontFamily: "'Courier New', monospace", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>
              {formData.latitude !== "" && formData.longitude !== "" && (
                <div style={{ marginTop: "6px", padding: "6px 10px", borderRadius: "4px", background: "rgba(14,85,101,0.06)", border: "1px solid rgba(14,85,101,0.15)", fontSize: "11px", color: "#0e5565", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>📍</span>
                  <span>{parseFloat(formData.latitude).toFixed(4)}, {parseFloat(formData.longitude).toFixed(4)}</span>
                  <button
                    onClick={() => { setFormData(p => ({ ...p, latitude: "", longitude: "" })); setLocationQuery(""); }}
                    style={{ marginLeft: "auto", background: "none", border: "none", color: "#8a1a1a", cursor: "pointer", fontSize: "11px", fontWeight: "600", fontFamily: "'Courier New', monospace" }}
                  >✕ Clear</button>
                </div>
              )}
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#4a3a18", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px" }}>Region</label>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "100px" : "125px"}, 1fr))`, gap: "6px" }}>
                {CONTINENTS.map(cont => (
                  <button key={cont.id} onClick={() => setFormData(p => ({ ...p, continent: cont.id }))}
                    style={{ padding: isMobile ? "10px 8px" : "8px 8px", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "6px", background: formData.continent === cont.id ? `${cont.color}1a` : "rgba(255,253,245,0.6)", border: formData.continent === cont.id ? `2px solid ${cont.color}70` : "1px solid rgba(100,80,20,0.12)", borderRadius: "6px", cursor: "pointer", color: formData.continent === cont.id ? cont.color : "#5a4828", fontFamily: "'Courier New', monospace", transition: "all 0.2s", minHeight: isMobile ? "44px" : "auto" }}>
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
                    style={{ flex: 1, padding: isMobile ? "10px 6px" : "8px 6px", fontSize: "11px", fontWeight: "600", background: formData.column === col.id ? "rgba(154,109,0,0.12)" : "rgba(255,253,245,0.6)", border: formData.column === col.id ? "2px solid rgba(154,109,0,0.4)" : "1px solid rgba(100,80,20,0.12)", borderRadius: "6px", cursor: "pointer", color: formData.column === col.id ? "#4a3a08" : "#5a4828", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace", transition: "all 0.2s", minWidth: "60px", minHeight: isMobile ? "44px" : "auto" }}>{col.icon} {col.id}</button>
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
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: isMobile ? "14px" : "11px", fontSize: isMobile ? "13px" : "12px", fontWeight: "600", background: "transparent", border: "1px solid rgba(100,80,20,0.2)", borderRadius: "6px", color: "#5a4828", cursor: "pointer", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace", minHeight: isMobile ? "48px" : "auto" }}>RETREAT</button>
              <button onClick={saveCard} style={{ flex: 1, padding: isMobile ? "14px" : "11px", fontSize: isMobile ? "13px" : "12px", fontWeight: "bold", background: "linear-gradient(135deg, rgba(154,109,0,0.18) 0%, rgba(120,85,10,0.18) 100%)", border: "2px solid rgba(154,109,0,0.35)", borderRadius: "6px", color: "#3d2a08", cursor: "pointer", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace", minHeight: isMobile ? "48px" : "auto" }}>⚡ {editCard ? "UPDATE" : "EMBARK"}</button>
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
        @media (max-width: 768px) {
          body { -webkit-text-size-adjust: 100%; }
        }
        @media (max-width: 480px) {
          body { font-size: 14px; }
        }
      `}</style>
    </div>
  );
}
