import { useState } from "react";
import { api, submissionErrorMessage } from "../api";
import { Link } from "../router";
import { ShieldIcon } from "../components/Icons";

export default function AdminLogin({ onLogin, onError, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setLocalError("");
    onError?.("");
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: { email: email.trim(), password },
      });
      onLogin(data);
    } catch (submitError) {
      const message = submissionErrorMessage(submitError);
      setLocalError(message);
      onError?.(message);
    } finally {
      setLoading(false);
    }
  };

  const message = localError || error;

  return (
    <div className="admin-login">
      <div className="admin-login-card">
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.25rem" }}>
          <span className="blog-brand-mark"><ShieldIcon size={18} /></span>
          <span>
            <span className="blog-brand-name">Sathish M</span>
            <span className="blog-brand-sub">Blog CMS</span>
          </span>
        </div>

        <h1>Administrator sign in</h1>
        <p>
          This area manages published research, drafts, uploads, and subscribers. Authorisation is
          enforced on the server for every action.
        </p>

        <form className="admin-form" onSubmit={submit}>
          <label className="blog-field">
            <span>Email</span>
            <input
              className="blog-input"
              type="email"
              name="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="blog-field">
            <span>Password</span>
            <input
              className="blog-input"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {message && <div className="blog-error" role="alert">{message}</div>}

          <button type="submit" className="blog-btn blog-btn-primary" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="admin-hint" style={{ marginTop: "1.25rem" }}>
          Credentials are configured in <code className="blog-inline-code">server/.env</code>. Sessions
          use an HttpOnly cookie and expire after seven days.
        </p>

        <div style={{ marginTop: "1rem" }}>
          <Link to="/blog" className="blog-btn blog-btn-sm">Back to the blog</Link>
        </div>
      </div>
    </div>
  );
}
