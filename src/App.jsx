import { useState, useEffect } from "react";
import { getSession, onAuthStateChange } from "./auth";
import AuthScreen from "./AuthScreen";
import VacationPlanner from "./VacationPlanner";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    // Check for existing session on mount
    getSession().then(({ session }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes (login, logout, token refresh)
    const unsubscribe = onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_OUT") setUser(null);
    });

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "linear-gradient(175deg, #f5eed6 0%, #e8dfc2 100%)",
        fontFamily: "'Georgia', serif",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "48px", animation: "float 2s ease-in-out infinite", marginBottom: "16px" }}>{"\uD83C\uDFFA"}</div>
          <div style={{ fontSize: "14px", color: "#7a5c1a", letterSpacing: "3px", textTransform: "uppercase" }}>
            Checking credentials...
          </div>
        </div>
        <style>{`@keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }`}</style>
      </div>
    );
  }

  if (demoMode) {
    return (
      <VacationPlanner
        user={{ email: "Demo Explorer" }}
        demoMode={true}
        onSignOut={() => setDemoMode(false)}
      />
    );
  }

  if (!user) {
    return <AuthScreen onAuth={(u) => setUser(u)} onDemoMode={() => setDemoMode(true)} />;
  }

  return (
    <VacationPlanner
      user={user}
      onSignOut={() => setUser(null)}
    />
  );
}
