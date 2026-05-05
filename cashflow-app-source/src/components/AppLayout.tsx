import { useState, useEffect, ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, ShoppingBag, Store, Mountain, Flower2, Home,
  FileBarChart, Settings, LogOut, Menu, X, TrendingUp, ChevronRight,
  ClipboardList, GraduationCap, ChevronDown, Wallet, BarChart3, Coins, Receipt, Hammer
} from "lucide-react";

interface NavChild {
  label: string;
  path: string;
  icon: ReactNode;
  halaman: string;
}

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  halaman: string;
  children?: NavChild[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" />, halaman: "dashboard" },
  { label: "Bakso Bento", path: "/divisi/bakso", icon: <ShoppingBag className="w-4 h-4" />, halaman: "bakso" },
  { label: "UD Amanah", path: "/divisi/amanah", icon: <Store className="w-4 h-4" />, halaman: "amanah" },
  { label: "Batu Alam", path: "/divisi/batualam", icon: <Mountain className="w-4 h-4" />, halaman: "batualam" },
  { label: "Toko Kembang", path: "/divisi/kembang", icon: <Flower2 className="w-4 h-4" />, halaman: "kembang" },
  {
    label: "Perumahan", path: "/divisi/perumahan", icon: <Home className="w-4 h-4" />, halaman: "perumahan",
    children: [
      { label: "Cashflow Perumahan", path: "/divisi/perumahan", icon: <BarChart3 className="w-3.5 h-3.5" />, halaman: "perumahan" },
      { label: "Data Akad", path: "/data-akad", icon: <ClipboardList className="w-3.5 h-3.5" />, halaman: "akad" },
      { label: "Cash Lunak", path: "/cash-lunak", icon: <Coins className="w-3.5 h-3.5" />, halaman: "cashlunak" },
      { label: "Progres Tukang", path: "/progres-tukang", icon: <Hammer className="w-3.5 h-3.5" />, halaman: "progrestukang" },
    ],
  },
  {
    label: "TK Yaris", path: "/divisi/tkyaris", icon: <GraduationCap className="w-4 h-4" />, halaman: "tkyaris",
    children: [
      { label: "Cashflow TK Yaris", path: "/divisi/tkyaris", icon: <BarChart3 className="w-3.5 h-3.5" />, halaman: "tkyaris" },
      { label: "Adm. Keuangan Siswa", path: "/adm-siswa", icon: <Receipt className="w-3.5 h-3.5" />, halaman: "admsiswa" },
    ],
  },
  { label: "Laporan", path: "/laporan", icon: <FileBarChart className="w-4 h-4" />, halaman: "laporan" },
  { label: "Pengaturan", path: "/pengaturan", icon: <Settings className="w-4 h-4" />, halaman: "pengaturan" },
];

const SIDEBAR_STATE_KEY = "cashflow_sidebar_state";

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout, hasAccess } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Track expand state for parent menus
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(SIDEBAR_STATE_KEY) || "{}");
    } catch {
      return {};
    }
  });

  // Auto-expand any parent menu when one of its children is active
  useEffect(() => {
    NAV_ITEMS.forEach(item => {
      if (!item.children) return;
      const childActive = item.children.some(c =>
        location === c.path || (c.path !== "/" && location.startsWith(c.path))
      );
      if (childActive && !expanded[item.halaman]) {
        setExpanded(prev => {
          const next = { ...prev, [item.halaman]: true };
          localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(next));
          return next;
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const toggleExpanded = (key: string) => {
    setExpanded(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // Visibility:
  // - Top-level item visible if hasAccess(halaman) !== "NONE" OR (has children AND any child visible)
  const visibleNav = NAV_ITEMS.filter(item => {
    if (item.children) {
      const anyChildVisible = item.children.some(c => hasAccess(c.halaman) !== "NONE");
      return anyChildVisible || hasAccess(item.halaman) !== "NONE";
    }
    return hasAccess(item.halaman) !== "NONE";
  });

  const handleLogout = () => {
    logout();
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      owner: "Owner",
      admin: "Administrator",
      staff_bakso: "Staff Bakso Bento",
      staff_amanah: "Staff UD Amanah",
      staff_batualam: "Staff Batu Alam",
      staff_kembang: "Staff Toko Kembang",
      staff_perumahan: "Staff Perumahan",
      staff_tkyaris: "Staff TK Yaris",
    };
    return labels[role] || role;
  };

  // Compute current page label for topbar
  const getCurrentPageLabel = () => {
    for (const item of NAV_ITEMS) {
      if (item.children) {
        for (const child of item.children) {
          if (location === child.path || (child.path !== "/" && location.startsWith(child.path))) {
            return child.label;
          }
        }
      }
      if (!item.children && (location === item.path || (item.path !== "/" && location.startsWith(item.path)))) {
        return item.label;
      }
    }
    return "Dashboard";
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        data-testid="sidebar"
        className={`
          fixed lg:static inset-y-0 left-0 z-30 flex flex-col
          w-64 sidebar-transition
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        style={{ background: "hsl(var(--sidebar))", borderRight: "1px solid hsl(var(--sidebar-border))" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: "1px solid hsl(var(--sidebar-border))" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--sidebar-primary))" }}>
              <TrendingUp className="w-5 h-5" style={{ color: "hsl(var(--sidebar-primary-foreground))" }} />
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "hsl(var(--sidebar-foreground))" }}>CashFlow Pro</p>
              <p className="text-xs" style={{ color: "hsl(var(--sidebar-foreground))", opacity: 0.5 }}>Multi Divisi</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-lg transition-colors"
            style={{ color: "hsl(var(--sidebar-foreground))" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {visibleNav.map(item => {
            // Parent with children (dropdown)
            if (item.children) {
              const visibleChildren = item.children.filter(c => hasAccess(c.halaman) !== "NONE");
              const isAnyChildActive = visibleChildren.some(c =>
                location === c.path || (c.path !== "/" && location.startsWith(c.path))
              );
              const isOpen = !!expanded[item.halaman];
              return (
                <div key={item.halaman}>
                  <button
                    type="button"
                    data-testid={`nav-parent-${item.halaman}`}
                    onClick={() => toggleExpanded(item.halaman)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer group"
                    style={{
                      background: isAnyChildActive ? "hsl(var(--sidebar-accent))" : "transparent",
                      color: isAnyChildActive ? "hsl(var(--sidebar-accent-foreground))" : "hsl(var(--sidebar-foreground))",
                    }}
                  >
                    <span style={{ color: isAnyChildActive ? "hsl(var(--sidebar-primary))" : "hsl(var(--sidebar-foreground))", opacity: isAnyChildActive ? 1 : 0.6 }}>
                      {item.icon}
                    </span>
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown
                      className="w-3.5 h-3.5 transition-transform"
                      style={{
                        opacity: 0.6,
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </button>
                  {isOpen && (
                    <div
                      className="mt-1 ml-4 pl-3 space-y-0.5 fade-in"
                      style={{ borderLeft: "1px solid hsl(var(--sidebar-border))" }}
                    >
                      {visibleChildren.map(child => {
                        const isChildActive = location === child.path || (child.path !== "/" && location.startsWith(child.path));
                        return (
                          <Link
                            key={child.path}
                            href={child.path}
                            data-testid={`nav-${child.halaman}`}
                            onClick={() => setSidebarOpen(false)}
                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer"
                            style={{
                              background: isChildActive ? "hsl(var(--sidebar-accent))" : "transparent",
                              color: isChildActive ? "hsl(var(--sidebar-accent-foreground))" : "hsl(var(--sidebar-foreground))",
                            }}
                          >
                            <span style={{ color: isChildActive ? "hsl(var(--sidebar-primary))" : "hsl(var(--sidebar-foreground))", opacity: isChildActive ? 1 : 0.55 }}>
                              {child.icon}
                            </span>
                            <span className="flex-1">{child.label}</span>
                            {isChildActive && <ChevronRight className="w-3 h-3 opacity-60" />}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            // Regular leaf item
            const isActive = location === item.path || (item.path !== "/" && location.startsWith(item.path));
            return (
              <Link
                key={item.path}
                href={item.path}
                data-testid={`nav-${item.halaman}`}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer group"
                style={{
                  background: isActive ? "hsl(var(--sidebar-accent))" : "transparent",
                  color: isActive ? "hsl(var(--sidebar-accent-foreground))" : "hsl(var(--sidebar-foreground))",
                }}
              >
                <span style={{ color: isActive ? "hsl(var(--sidebar-primary))" : "hsl(var(--sidebar-foreground))", opacity: isActive ? 1 : 0.6 }}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="px-3 py-4" style={{ borderTop: "1px solid hsl(var(--sidebar-border))" }}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "hsl(var(--sidebar-accent))" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "hsl(var(--sidebar-primary))", color: "hsl(var(--sidebar-primary-foreground))" }}>
              {user?.namaLengkap?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: "hsl(var(--sidebar-accent-foreground))" }}>{user?.namaLengkap}</p>
              <p className="text-xs truncate" style={{ color: "hsl(var(--sidebar-foreground))", opacity: 0.5 }}>{getRoleLabel(user?.role || "")}</p>
            </div>
            <button
              data-testid="button-logout"
              onClick={handleLogout}
              className="p-1.5 rounded-lg transition-colors hover:bg-red-500/20"
              title="Logout"
              style={{ color: "hsl(var(--sidebar-foreground))", opacity: 0.7 }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-5 py-3.5 border-b bg-card" style={{ borderColor: "hsl(var(--border))" }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl transition-colors hover:bg-muted"
            data-testid="button-menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground">{getCurrentPageLabel()}</h2>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-foreground">{user?.namaLengkap}</span>
              <span className="text-xs text-muted-foreground">{getRoleLabel(user?.role || "")}</span>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-primary text-primary-foreground">
              {user?.namaLengkap?.[0]?.toUpperCase() || "U"}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="fade-in p-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
