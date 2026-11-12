import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, setCsrfToken } from "../api";
import { Link, useRouter } from "../router";
import { useSeo } from "../seo";
import {
  BookIcon,
  DashboardIcon,
  FileIcon,
  LogOutIcon,
  PlusIcon,
  SendIcon,
  ShieldIcon,
  TagIcon,
  UsersIcon,
} from "../components/Icons";
import AdminLogin from "./AdminLogin";
import Dashboard from "./Dashboard";
import Posts from "./Posts";
import Editor from "./Editor";
import Taxonomy from "./Taxonomy";
import Subscribers from "./Subscribers";
import Writers from "./Writers";
import {
  canManageTaxonomy,
  canManageWriters,
  canViewSubscribers,
  roleLabel,
} from "./permissions";

const AdminContext = createContext(null);

export function useAdmin() {
  return useContext(AdminContext);
}

/**
 * The console navigation.
 *
 * `roles` lists who may see each entry. Writers never meet a link they
 * cannot use — a wall of 403s is worse than a smaller menu.
 */
const NAV = [
  { label: "Dashboard", to: "/admin/blog", icon: DashboardIcon, exact: true, roles: ["admin", "editor"] },
  { label: "Articles", to: "/admin/blog/posts", icon: FileIcon, roles: ["admin", "editor"] },
  { label: "Categories & tags", to: "/admin/blog/taxonomy", icon: TagIcon, roles: ["admin"] },
  { label: "Authors", to: "/admin/blog/authors", icon: UsersIcon, roles: ["admin"] },
  { label: "Writers", to: "/admin/blog/writers", icon: ShieldIcon, roles: ["admin"] },
  { label: "Subscribers", to: "/admin/blog/subscribers", icon: SendIcon, roles: ["admin"] },
];

function AdminSidebar({ admin, onLogout }) {
  const { path } = useRouter();
  const visible = NAV.filter((item) => item.roles.includes(admin?.role || "editor"));

  return (
    <aside className="admin-sidebar">
      <Link className="admin-brand" to="/admin/blog">
        <span className="blog-brand-mark">SM</span>
        <span>
          <span className="blog-brand-name">Blog CMS</span>
          <span className="blog-brand-sub">Admin console</span>
        </span>
      </Link>

      <nav className="admin-nav" aria-label="Admin">
        {visible.map((item) => {
          const active = item.exact ? path === item.to : path.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} className={active ? "active" : ""}>
              <Icon size={16} /> {item.label}
            </Link>
          );
        })}
        <Link to="/admin/blog/new">
          <PlusIcon size={16} /> Write an article
        </Link>
        <a href={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/blog`}>
          <BookIcon size={16} /> View public blog
        </a>
      </nav>

      <div className="admin-sidebar-foot">
        <div className="admin-user">
          <strong>{admin.name || "Administrator"}</strong>
          <span>{admin.email}</span>
          <span className={`admin-role-pill ${admin.role}`}>{roleLabel(admin)}</span>
        </div>
        <button type="button" className="blog-btn blog-btn-sm" onClick={onLogout}>
          <LogOutIcon size={14} /> Sign out
        </button>
      </div>
    </aside>
  );
}

function NoAccess() {
  return (
    <div className="admin-panel" style={{ padding: "2rem" }}>
      <h2 style={{ color: "#fafafa", marginBottom: "0.5rem" }}>Not available to your role</h2>
      <p className="blog-muted">
        This area is limited to administrators. If you need it, ask the site owner to change your role.
      </p>
      <Link to="/admin/blog" className="blog-btn blog-btn-sm" style={{ marginTop: "1rem" }}>
        Back to dashboard
      </Link>
    </div>
  );
}

export default function AdminApp() {
  const { path, navigate } = useRouter();
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [notice, setNotice] = useState("");

  useSeo({
    title: "Blog CMS",
    description: "Private blog administration.",
    path: path,
    noIndex: true,
  });

  useEffect(() => {
    let active = true;
    api("/auth/me")
      .then((data) => {
        if (!active) return;
        setAdmin(data.admin);
        setCsrfToken(data.csrfToken);
      })
      .catch(() => {
        if (active) setAdmin(null);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // Session may already be gone; clearing local state is enough.
    }
    setCsrfToken(null);
    setAdmin(null);
    navigate("/admin/blog");
  }, [navigate]);

  const value = useMemo(() => ({ admin, setAdmin, logout, notice, setNotice }), [admin, logout, notice]);

  if (checking) {
    return (
      <div className="admin-login">
        <div className="admin-login-card" aria-live="polite">
          <p className="blog-dim">Checking your session…</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <AdminLogin
        error={loginError}
        onLogin={(data) => {
          setLoginError("");
          setCsrfToken(data.csrfToken);
          setAdmin(data.admin);
          if (path === "/admin") navigate("/admin/blog");
        }}
        onError={setLoginError}
      />
    );
  }

  let content = null;
  if (path === "/admin" || path === "/admin/blog" || path === "/admin/blog/") {
    content = <Dashboard />;
  } else if (path === "/admin/blog/posts") {
    content = <Posts />;
  } else if (path === "/admin/blog/new") {
    content = <Editor />;
  } else if (path.startsWith("/admin/blog/edit/")) {
    content = <Editor postId={path.split("/").pop()} />;
  } else if (path === "/admin/blog/taxonomy") {
    content = canManageTaxonomy(admin) ? <Taxonomy kind="categories" /> : <NoAccess />;
  } else if (path === "/admin/blog/authors") {
    content = canManageTaxonomy(admin) ? <Taxonomy kind="authors" /> : <NoAccess />;
  } else if (path === "/admin/blog/writers") {
    content = canManageWriters(admin) ? <Writers /> : <NoAccess />;
  } else if (path === "/admin/blog/subscribers") {
    content = canViewSubscribers(admin) ? <Subscribers /> : <NoAccess />;
  } else {
    content = (
      <div className="admin-panel" style={{ padding: "2rem" }}>
        <h2 style={{ color: "#fafafa", marginBottom: "0.5rem" }}>Page not found</h2>
        <p className="blog-muted">That admin route does not exist.</p>
        <Link to="/admin/blog" className="blog-btn blog-btn-sm" style={{ marginTop: "1rem" }}>
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={value}>
      <div className="admin-shell">
        <AdminSidebar admin={admin} onLogout={logout} />
        <main className="admin-main">
          {notice && (
            <div className="blog-success" style={{ marginBottom: "1rem" }} role="status">
              {notice}
            </div>
          )}
          {content}
        </main>
      </div>
    </AdminContext.Provider>
  );
}

export { AdminContext };
