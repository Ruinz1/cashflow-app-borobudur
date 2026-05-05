import { Switch, Route, Router as WouterRouter, useParams } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import DivisiPage from "@/pages/DivisiPage";
import LaporanPage from "@/pages/LaporanPage";
import PengaturanPage from "@/pages/PengaturanPage";
import DataAkadPage from "@/pages/DataAkadPage";
import CashLunakPage from "@/pages/CashLunakPage";
import AdmSiswaPage from "@/pages/AdmSiswaPage";
import ProgresTukangPage from "@/pages/ProgresTukangPage";

const queryClient = new QueryClient();

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
        <span className="text-2xl text-red-500 font-bold">!</span>
      </div>
      <p className="text-lg font-semibold text-foreground">Akses Ditolak</p>
      <p className="text-muted-foreground text-sm">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
    </div>
  );
}

function AppRoutes() {
  const { user, isLoading, hasAccess } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-muted-foreground text-sm">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={() => {
          const access = hasAccess("dashboard");
          return access !== "NONE" ? <DashboardPage /> : <AccessDenied />;
        }} />
        <Route path="/dashboard" component={() => {
          const access = hasAccess("dashboard");
          return access !== "NONE" ? <DashboardPage /> : <AccessDenied />;
        }} />
        <Route path="/divisi/:divisi" component={() => {
          const params = useParams<{ divisi: string }>();
          const access = hasAccess(params.divisi ?? "");
          return access !== "NONE" ? <DivisiPage /> : <AccessDenied />;
        }} />
        <Route path="/laporan" component={() => {
          const access = hasAccess("laporan");
          return access !== "NONE" ? <LaporanPage /> : <AccessDenied />;
        }} />
        <Route path="/pengaturan" component={() => {
          const access = hasAccess("pengaturan");
          return access !== "NONE" ? <PengaturanPage /> : <AccessDenied />;
        }} />
        <Route path="/data-akad" component={() => {
          const access = hasAccess("akad");
          return access !== "NONE" ? <DataAkadPage /> : <AccessDenied />;
        }} />
        <Route path="/cash-lunak" component={() => {
          const access = hasAccess("cashlunak");
          return access !== "NONE" ? <CashLunakPage /> : <AccessDenied />;
        }} />
        <Route path="/adm-siswa" component={() => {
          const access = hasAccess("admsiswa");
          return access !== "NONE" ? <AdmSiswaPage /> : <AccessDenied />;
        }} />
        <Route path="/progres-tukang" component={() => {
          const access = hasAccess("progrestukang");
          return access !== "NONE" ? <ProgresTukangPage /> : <AccessDenied />;
        }} />
        <Route component={() => (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-2xl font-bold text-foreground">404</p>
            <p className="text-muted-foreground">Halaman tidak ditemukan</p>
          </div>
        )} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRoutes />
        </WouterRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
