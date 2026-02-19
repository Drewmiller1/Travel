import { useState } from "react";
import { signIn, signUp } from "./auth";

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    if (mode === "signup") {
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { user, error: authError } = await signIn(email, password);
        if (authError) {
          setError(authError.message === "Invalid login credentials"
            ? "Invalid email or password. Check your credentials and try again."
            : authError.message);
        } else if (user) {
          onAuth(user);
        }
      } else {
        const { user, error: authError } = await signUp(email, password);
        if (authError) {
          setError(authError.message);
        } else {
          // Supabase may require email confirmation
          if (user?.identities?.length === 0) {
            setError("An account with this email already exists.");
          } else {
            setSignupSuccess(true);
          }
        }
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px",
    background: "rgba(255,253,245,0.8)",
    border: "1px solid rgba(100,80,20,0.2)",
    borderRadius: "6px", color: "#2e2410",
    fontFamily: "'Courier New', monospace", fontSize: "14px",
    outline: "none", boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  const labelStyle = {
    display: "block", fontSize: "11px", fontWeight: "700",
    color: "#4a3a18", letterSpacing: "2px", textTransform: "uppercase",
    marginBottom: "6px",
  };

  if (signupSuccess) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(175deg, #f5eed6 0%, #efe4c8 30%, #f0e8d0 60%, #e8dfc2 100%)", fontFamily: "'Courier New', monospace" }}>
        <div style={{ textAlign: "center", maxWidth: "400px", padding: "40px 32px", background: "linear-gradient(135deg, #fdfaf0 0%, #f2ebd4 100%)", border: "1px solid rgba(100,80,20,0.2)", borderRadius: "12px", boxShadow: "0 16px 48px rgba(60,48,20,0.15)" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>ðŸ“¬</div>
          <h2 style={{ fontSize: "20px", fontFamily: "'Georgia', serif", color: "#3d2a08", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>CHECK YOUR EMAIL</h2>
          <p style={{ fontSize: "13px", color: "#5a4828", lineHeight: 1.6, marginBottom: "20px" }}>
            We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account, then come back here to sign in.
          </p>
          <button onClick={() => { setSignupSuccess(false); setMode("login"); setPassword(""); setConfirmPassword(""); }}
            style={{ padding: "11px 28px", fontSize: "12px", fontWeight: "bold", background: "linear-gradient(135deg, rgba(154,109,0,0.18) 0%, rgba(120,85,10,0.18) 100%)", border: "2px solid rgba(154,109,0,0.35)", borderRadius: "6px", color: "#3d2a08", cursor: "pointer", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "'Courier New', monospace" }}>
            âš¡ BACK TO LOGIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(175deg, #f5eed6 0%, #efe4c8 30%, #f0e8d0 60%, #e8dfc2 100%)",
      fontFamily: "'Courier New', monospace", position: "relative", overflow: "hidden",
    }}>
      {/* Background decorations */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, background: `radial-gradient(ellipse at 20% 50%, rgba(184,134,11,0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(160,82,45,0.05) 0%, transparent 40%)` }} />
      <div style={{ position: "fixed", bottom: "-80px", right: "-80px", width: "300px", height: "300px", opacity: 0.05, fontSize: "300px", pointerEvents: "none" }}>ðŸ§­</div>

      <div style={{
        position: "relative", zIndex: 10, width: "100%", maxWidth: "420px", padding: "20px",
        animation: "slideUp 0.4s ease",
      }}>
        <div style={{
          background: "linear-gradient(135deg, #fdfaf0 0%, #f2ebd4 100%)",
          border: "1px solid rgba(100,80,20,0.2)", borderRadius: "12px",
          padding: "36px 32px",
          boxShadow: "0 16px 48px rgba(60,48,20,0.15)",
        }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: "28px" }}>
            <div style={{ fontSize: "40px", marginBottom: "8px", animation: "float 3s ease-in-out infinite" }}>ðŸº</div>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "bold", fontFamily: "'Georgia', serif", color: "#3d2a08", letterSpacing: "3px", textTransform: "uppercase" }}>
              ADVENTURE LEDGER
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: "11px", letterSpacing: "3px", color: "#6a5530", textTransform: "uppercase", fontWeight: "500" }}>
              {mode === "login" ? "Resume Your Expedition" : "Begin Your Journey"}
            </p>
          </div>

          {/* Tab switcher */}
          <div style={{ display: "flex", marginBottom: "24px", borderRadius: "6px", overflow: "hidden", border: "1px solid rgba(100,80,20,0.15)" }}>
            {["login", "signup"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{
                  flex: 1, padding: "10px", fontSize: "11px", fontWeight: "700",
                  letterSpacing: "1.5px", textTransform: "uppercase",
                  fontFamily: "'Courier New', monospace", cursor: "pointer",
                  border: "none", transition: "all 0.2s",
                  background: mode === m ? "rgba(154,109,0,0.15)" : "transparent",
                  color: mode === m ? "#3d2a08" : "#8a7a58",
                }}>
                {m === "login" ? "ðŸ—ï¸ Sign In" : "ðŸ“œ Sign Up"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="indiana@jones.com" autoComplete="email"
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = "rgba(120,90,20,0.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(154,109,0,0.08)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(100,80,20,0.2)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Min 6 characters" : "Enter password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = "rgba(120,90,20,0.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(154,109,0,0.08)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(100,80,20,0.2)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {mode === "signup" && (
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Confirm Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password" autoComplete="new-password"
                  style={inputStyle}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(120,90,20,0.4)"; e.target.style.boxShadow = "0 0 0 3px rgba(154,109,0,0.08)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(100,80,20,0.2)"; e.target.style.boxShadow = "none"; }}
                />
              </div>
            )}

            {error && (
              <div style={{
                padding: "10px 14px", marginBottom: "16px", borderRadius: "6px",
                background: "rgba(138,26,26,0.06)", border: "1px solid rgba(138,26,26,0.2)",
                color: "#8a1a1a", fontSize: "12px", lineHeight: 1.5,
              }}>âš ï¸ {error}</div>
            )}

            <button type="submit" disabled={loading}
              style={{
                width: "100%", padding: "13px", fontSize: "13px", fontWeight: "bold",
                background: loading
                  ? "rgba(100,80,20,0.1)"
                  : "linear-gradient(135deg, rgba(154,109,0,0.2) 0%, rgba(120,85,10,0.2) 100%)",
                border: "2px solid rgba(154,109,0,0.35)",
                borderRadius: "6px", color: "#3d2a08", cursor: loading ? "wait" : "pointer",
                letterSpacing: "1.5px", textTransform: "uppercase",
                fontFamily: "'Courier New', monospace", transition: "all 0.2s",
              }}>
              {loading ? "âŸ³ LOADING..." : mode === "login" ? "âš¡ ENTER THE VAULT" : "âš¡ JOIN THE EXPEDITION"}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        ::placeholder { color: #9a8a68 !important; }
      `}</style>
    </div>
  );
}
