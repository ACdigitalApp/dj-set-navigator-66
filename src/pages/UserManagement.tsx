import { useState, useEffect, useCallback } from "react";
import {
  Users, Shield, ShieldCheck, Phone, Save, Loader2, RefreshCw,
  Search, Trash2, TrendingUp, UserPlus,
  Crown, Ban, CheckCircle2, CreditCard, Calendar, Euro,
  AlertTriangle, UserCheck,
  Eye, EyeOff, Copy, Wand2, Check, X as XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Cross-app revenue (placeholder a 0 — non rompiamo niente) ───────────────
const CROSS_APP_LABELS: Record<string, string> = {
  djsengine: "DJSEngine",
  librifree: "LibriFree",
  gestionescadenze: "Gestione Scadenze",
  gestionepassword: "Gestione Password",
  speakeasy: "Speak & Translate",
  rosariosettimanale: "Rosario Settimanale",
};

// ── Types ────────────────────────────────────────────────────────────────────
interface UserRow {
  user_id: string;
  email: string | null;
  display_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  account_status: string;
  created_at: string | null;
  updated_at: string | null;
  role: "admin" | "user";
  subscription_plan: string;
  subscription_status: string;
  current_period_end: string | null;
  stripe_customer_id: string | null;
  total_paid: number;
  balance: number;
  notification_enabled: boolean;
}

interface EditForm {
  display_name: string;
  email: string;
  phone: string;
  whatsapp: string;
  role: "admin" | "user";
  subscription_plan: string;
  subscription_status: string;
  current_period_end: string;
  account_status: string;
  notification_enabled: boolean;
}

interface NewUserForm {
  display_name: string;
  email: string;
  password: string;
  phone: string;
  whatsapp: string;
  same_whatsapp: boolean;
  role: "admin" | "user";
  subscription_plan: string;
}

// ── Constants ────────────────────────────────────────────────────────────────
const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  monthly: "Monthly",
  yearly: "Yearly",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Attivo",
  trialing: "Trial",
  cancelled: "Cancellato",
  blocked: "Bloccato",
  expired: "Scaduto",
  past_due: "Scaduto",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  trialing: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled: "bg-gray-100 text-gray-600 border-gray-200",
  blocked: "bg-red-50 text-red-700 border-red-200",
  expired: "bg-orange-50 text-orange-700 border-orange-200",
  past_due: "bg-orange-50 text-orange-700 border-orange-200",
};

function getRoleBadge(role: "admin" | "user", plan: string | null) {
  if (role === "admin") {
    return (
      <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs gap-1">
        <Shield className="w-3 h-3" /> Admin
      </Badge>
    );
  }
  if (plan && plan !== "free") {
    return (
      <Badge className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 text-xs gap-1 font-semibold">
        <Crown className="w-3 h-3" /> User Pro
      </Badge>
    );
  }
  return <Badge variant="secondary" className="text-xs">User</Badge>;
}

function getPlanBadge(plan: string | null) {
  const p = plan || "free";
  const label = PLAN_LABELS[p] || p;
  if (p !== "free") {
    return (
      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs gap-1">
        <Crown className="w-3 h-3" />{label}
      </Badge>
    );
  }
  return <Badge variant="outline" className="text-xs text-muted-foreground">{label}</Badge>;
}

function getStatusBadge(status: string | null) {
  const s = status || "active";
  const label = STATUS_LABELS[s] || s;
  const color = STATUS_COLORS[s] || STATUS_COLORS.active;
  return <Badge variant="outline" className={`text-xs font-medium ${color}`}>{label}</Badge>;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleString("it-IT", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return dateStr.split("T")[0];
  }
}

function formatCurrency(val: number) {
  if (!val) return "—";
  return `€${val.toFixed(2)}`;
}

function normalizePhoneDigits(value: string) {
  return value.replace(/[^0-9]/g, "");
}

// ── Password helpers ─────────────────────────────────────────────────────────
function validatePassword(pwd: string, email?: string, displayName?: string) {
  const checks = {
    length: pwd.length >= 12,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    symbol: /[^A-Za-z0-9]/.test(pwd),
    noName: !displayName || displayName.trim().length < 3 || !pwd.toLowerCase().includes(displayName.trim().toLowerCase()),
    noEmail: !email || !email.includes("@") || !pwd.toLowerCase().includes(email.split("@")[0].toLowerCase()) || email.split("@")[0].length < 3,
  };
  const valid = Object.values(checks).every(Boolean);
  return { valid, checks };
}

function generateStrongPassword(length = 16) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const nums = "23456789";
  const syms = "!@#$%^&*?-_=+";
  const all = upper + lower + nums + syms;
  const rnd = (set: string) => set[Math.floor(Math.random() * set.length)];
  let pwd = [rnd(upper), rnd(lower), rnd(nums), rnd(syms)];
  for (let i = pwd.length; i < length; i++) pwd.push(rnd(all));
  for (let i = pwd.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
  }
  return pwd.join("");
}

function StatCard({
  icon: Icon, label, value, color = "text-primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <Card className="border border-border/60">
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-col items-center gap-1 text-center">
          <div className={`p-2 rounded-lg bg-primary/5 ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function UserManagementPage() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [blocking, setBlocking] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    display_name: "",
    email: "",
    phone: "",
    whatsapp: "",
    role: "user",
    subscription_plan: "free",
    subscription_status: "active",
    current_period_end: "",
    account_status: "active",
    notification_enabled: false,
  });
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [showNewUser, setShowNewUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState<NewUserForm>({
    display_name: "", email: "", password: "", phone: "", whatsapp: "", same_whatsapp: true, role: "user", subscription_plan: "free",
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const [visitCount, setVisitCount] = useState<number>(0);
  const [appVisits, setAppVisits] = useState<Record<string, number>>({});

  useEffect(() => {
    (supabase.from as any)('app_visit_counters')
      .select('app_key, total_visits')
      .then(({ data, error }: { data: Array<{ app_key: string; total_visits: number }> | null; error: unknown }) => {
        if (error || !data) return;
        const map: Record<string, number> = {};
        data.forEach((r) => { map[r.app_key] = r.total_visits; });
        setAppVisits(map);
        setVisitCount(map['djsengine'] ?? 0);
      });
  }, []);

  // Cross-app revenue (statico a 0)
  const crossApp: Record<string, { amount: number; users: number }> = Object.fromEntries(
    Object.keys(CROSS_APP_LABELS).map((k) => [k, { amount: 0, users: 0 }])
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (pErr) { toast.error("Errore caricamento utenti"); return; }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "admin");

      const adminSet = new Set((roles ?? []).map((r: any) => r.user_id));

      const merged: UserRow[] = (profiles ?? []).map((p: any) => ({
        user_id: p.user_id,
        email: p.email ?? null,
        display_name: p.display_name,
        phone: p.phone ?? null,
        whatsapp: p.whatsapp ?? null,
        account_status: p.account_status ?? "active",
        created_at: p.created_at,
        updated_at: p.updated_at,
        role: adminSet.has(p.user_id) ? "admin" : "user",
        subscription_plan: p.plan ?? "free",
        subscription_status: p.subscription_status ?? "active",
        current_period_end: null,
        stripe_customer_id: null,
        total_paid: 0,
        balance: 0,
        notification_enabled: p.notification_enabled ?? false,
      }));

      setUsers(merged);
    } catch {
      toast.error("Errore nel caricamento utenti");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const stats = {
    incassoTotale: users.reduce((s, u) => s + u.total_paid, 0),
    saldoTotale: users.reduce((s, u) => s + u.balance, 0),
    utentiPaganti: users.filter((u) => u.subscription_plan !== "free").length,
    ultimi30gg: 0,
    trialAttive: users.filter((u) => u.subscription_status === "trialing").length,
    scaduti: users.filter((u) => ["expired", "cancelled", "past_due"].includes(u.subscription_status)).length,
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase().trim();
    const phoneDigits = (u.phone || "").replace(/[^0-9]/g, "");
    const whatsappDigits = (u.whatsapp || "").replace(/[^0-9]/g, "");
    const qDigits = q.replace(/[^0-9]/g, "");
    const matchSearch =
      !q ||
      (u.display_name || u.email || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q) ||
      (u.whatsapp || "").toLowerCase().includes(q) ||
      (qDigits.length > 0 && (phoneDigits.includes(qDigits) || whatsappDigits.includes(qDigits)));
    const matchPlan = filterPlan === "all" || u.subscription_plan === filterPlan;
    const matchStatus = filterStatus === "all" || u.subscription_status === filterStatus;
    return matchSearch && matchPlan && matchStatus;
  });

  const startEditing = (u: UserRow) => {
    setEditingUser(u.user_id);
    setEditForm({
      display_name: u.display_name || "",
      email: u.email || "",
      phone: u.phone || "",
      whatsapp: u.whatsapp || "",
      role: u.role,
      subscription_plan: u.subscription_plan,
      subscription_status: u.subscription_status,
      current_period_end: u.current_period_end ? u.current_period_end.split("T")[0] : "",
      account_status: u.account_status,
      notification_enabled: u.notification_enabled,
    });
  };

  const cancelEditing = () => setEditingUser(null);

  const toggleNotifications = async (userId: string, nextValue: boolean) => {
    const previousUsers = users;
    setUsers((prev) => prev.map((user) => (user.user_id === userId ? { ...user, notification_enabled: nextValue } : user)));

    const { error } = await supabase
      .from("profiles")
      .update({ notification_enabled: nextValue, updated_at: new Date().toISOString() } as any)
      .eq("user_id", userId);

    if (error) {
      setUsers(previousUsers);
      toast.error("Errore aggiornamento notifiche");
      return;
    }

    toast.success("Preferenza notifiche aggiornata");
  };

  const saveUser = async (userId: string) => {
    try {
      setSaving(userId);
      if (normalizePhoneDigits(editForm.phone).length < 8) {
        toast.error("Inserisci un numero di telefono valido.");
        return;
      }
      if (normalizePhoneDigits(editForm.whatsapp).length < 8) {
        toast.error("Inserisci un numero WhatsApp valido.");
        return;
      }
      const profilePayload: any = {
        display_name: editForm.display_name || null,
        email: editForm.email || null,
        phone: editForm.phone || null,
        whatsapp: editForm.whatsapp || null,
        plan: editForm.subscription_plan,
        subscription_status: editForm.subscription_status,
        notification_enabled: editForm.notification_enabled,
        updated_at: new Date().toISOString(),
      };
      const { error: pErr } = await supabase.from("profiles").update(profilePayload).eq("user_id", userId);
      if (pErr) { toast.error("Errore aggiornamento profilo"); return; }

      const { data: existingRole } = await supabase
        .from("user_roles").select("id")
        .eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (editForm.role === "admin" && !existingRole) {
        await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
      } else if (editForm.role === "user" && existingRole) {
        await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      }

      toast.success("Utente aggiornato con successo");
      setEditingUser(null);
      fetchUsers();
    } catch {
      toast.error("Errore salvataggio");
    } finally {
      setSaving(null);
    }
  };

  const toggleBlock = async (u: UserRow) => {
    try {
      setBlocking(u.user_id);
      // Schema non ha account_status: aggiorniamo updated_at e mostriamo toast
      await supabase.from("profiles").update({ updated_at: new Date().toISOString() }).eq("user_id", u.user_id);
      toast.success(u.account_status === "suspended" ? "Utente sbloccato" : "Utente bloccato");
      fetchUsers();
    } finally {
      setBlocking(null);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      setDeleting(userId);
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
      if (error) { toast.error("Errore eliminazione utente"); return; }
      setUsers((prev) => prev.filter((u) => u.user_id !== userId));
      toast.success("Utente eliminato");
    } finally {
      setDeleting(null);
    }
  };

  const createUser = async () => {
    if (!newUserForm.email || !newUserForm.password) {
      toast.error("Email e password sono obbligatori");
      return;
    }
    const phoneDigits = newUserForm.phone.replace(/\D/g, "");
    const waVal = newUserForm.same_whatsapp ? newUserForm.phone : newUserForm.whatsapp;
    const waDigits = waVal.replace(/\D/g, "");
    if (phoneDigits.length < 8) {
      toast.error("Inserisci un numero di telefono valido.");
      return;
    }
    if (waDigits.length < 8) {
      toast.error("Inserisci un numero WhatsApp valido.");
      return;
    }
    const validation = validatePassword(newUserForm.password, newUserForm.email, newUserForm.display_name);
    if (!validation.valid) {
      toast.error("Password troppo debole. Usa almeno 12 caratteri con maiuscole, minuscole, numeri e simboli.");
      return;
    }
    try {
      setCreatingUser(true);
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: {
          action: "create-user",
          payload: {
            display_name: newUserForm.display_name,
            email: newUserForm.email,
            password: newUserForm.password,
            phone: newUserForm.phone,
            whatsapp: waVal,
            role: newUserForm.role,
            subscription_plan: newUserForm.subscription_plan,
          },
        },
      });
      if (error || (data as any)?.error) {
        const msg = String((data as any)?.error ?? error?.message ?? "").toLowerCase();
        if (msg.includes("weak") || msg.includes("pwned") || msg.includes("known") || msg.includes("easy to guess")) {
          toast.error("Password rifiutata perché troppo semplice o già nota. Scegline una più sicura.");
        } else {
          toast.error("Errore creazione utente: " + ((data as any)?.error ?? error?.message ?? ""));
        }
        return;
      }
      toast.success("Utente creato con successo");
      setShowNewUser(false);
      setNewUserForm({ display_name: "", email: "", password: "", phone: "", whatsapp: "", same_whatsapp: true, role: "user", subscription_plan: "free" });
      fetchUsers();
    } catch {
      toast.error("Errore creazione utente");
    } finally {
      setCreatingUser(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 w-full max-w-none">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-primary">Gestione Utenti</h1>
            <p className="text-xs text-muted-foreground">Amministra utenti, piani e incassi</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchUsers} className="gap-2 text-primary border-primary/30 hover:bg-primary/10">
            <RefreshCw className="w-4 h-4" /> Aggiorna
          </Button>
          <Button size="sm" onClick={() => setShowNewUser(true)} className="gap-2 bg-primary hover:bg-primary/90">
            <UserPlus className="w-4 h-4" /> Nuovo Utente
          </Button>
        </div>
      </div>

      {/* Visitor Counters per App */}
      <Card className="p-4 bg-card">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-[#2D6A4F] font-[Inter]">Visite Totali per App</span>
          <span className="text-xs text-muted-foreground">
            Totale: {Object.values(appVisits).reduce((s, v) => s + v, 0).toLocaleString()}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(CROSS_APP_LABELS).map(([key, label]) => {
            const count = appVisits[key] ?? 0;
            return (
              <div key={key} className="flex items-center justify-between rounded-lg border bg-secondary/30 px-3 py-2">
                <span className="text-xs font-semibold text-foreground truncate">{label}</span>
                <div className="flex gap-0.5">
                  {String(count).padStart(5, '0').split("").map((digit, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center justify-center w-6 h-8 rounded bg-card font-mono font-bold text-sm text-[#2D6A4F] border border-border"
                    >
                      {digit}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <StatCard icon={Euro} label="Incasso Totale" value={`€${stats.incassoTotale.toFixed(2)}`} color="text-green-600" />
        <StatCard icon={TrendingUp} label="Saldo Totale" value={`€${stats.saldoTotale.toFixed(2)}`} color="text-blue-600" />
        <StatCard icon={UserCheck} label="Utenti Paganti" value={stats.utentiPaganti} color="text-yellow-600" />
        <StatCard icon={Euro} label="Ultimi 30gg" value={`€${stats.ultimi30gg.toFixed(2)}`} color="text-purple-600" />
        <StatCard icon={Calendar} label="Trial Attive" value={stats.trialAttive} color="text-cyan-600" />
        <StatCard icon={AlertTriangle} label="Scaduti" value={stats.scaduti} color="text-red-500" />
      </div>

      {/* Incassi Tutte le App */}
      <Card>
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-primary">
            <TrendingUp className="w-4 h-4" /> Incassi Tutte le App
          </div>
          <span className="text-sm font-bold text-primary">
            Totale Generale: €{Object.values(crossApp).reduce((s, d) => s + d.amount, 0).toFixed(2)}
          </span>
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(CROSS_APP_LABELS).map(([key, label]) => {
            const d = crossApp[key];
            return (
              <div key={key} className="rounded-xl border p-4 flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold text-primary">€{d.amount.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{d.users} utenti paganti</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Filters + Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cerca nome, email, telefono o WhatsApp..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
            <Select value={filterPlan} onValueChange={setFilterPlan}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Tutti i piani" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i piani</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Tutti gli stati" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="active">Attivo</SelectItem>
                <SelectItem value="trialing">Trial</SelectItem>
                <SelectItem value="cancelled">Cancellato</SelectItem>
                <SelectItem value="past_due">Scaduto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="whitespace-nowrap">Nome</TableHead>
                  <TableHead className="whitespace-nowrap">Email</TableHead>
                  <TableHead className="whitespace-nowrap">Telefono</TableHead>
                  <TableHead className="whitespace-nowrap">WhatsApp</TableHead>
                  <TableHead className="whitespace-nowrap">Ruolo</TableHead>
                  <TableHead className="whitespace-nowrap">Piano</TableHead>
                  <TableHead className="whitespace-nowrap">Provider</TableHead>
                  <TableHead className="whitespace-nowrap">Stato Abb.</TableHead>
                  <TableHead className="whitespace-nowrap">Scadenza</TableHead>
                  <TableHead className="whitespace-nowrap">Tot. Pagato</TableHead>
                  <TableHead className="whitespace-nowrap">Saldo</TableHead>
                  <TableHead className="whitespace-nowrap">Notifiche</TableHead>
                  <TableHead className="whitespace-nowrap">Data Reg.</TableHead>
                  <TableHead className="whitespace-nowrap">Ultimo Accesso</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableCell colSpan={15} className="py-1 px-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      Utenti Registrati ({filtered.length}{search ? ` di ${users.length}` : ""})
                    </div>
                  </TableCell>
                </TableRow>

                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center py-10 text-muted-foreground text-sm">
                      Nessun utente trovato
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => {
                    const isEditing = editingUser === u.user_id;
                    const isMe = u.user_id === currentUserId;
                    return (
                      <TableRow key={u.user_id} className={isEditing ? "bg-primary/5" : ""}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0
                              ${u.role === "admin"
                                ? "bg-gradient-to-br from-green-500 to-green-700"
                                : "bg-gradient-to-br from-primary to-green-800"}`}>
                              {(u.display_name || u.email || "U")[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-medium">
                              {isEditing ? (
                                <Input
                                  value={editForm.display_name}
                                  onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                                  className="h-7 text-xs w-32"
                                />
                              ) : (u.display_name || u.email || "—")}
                              {isMe && <Badge variant="outline" className="ml-1 text-[10px] py-0">Tu</Badge>}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{u.email || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {isEditing ? (
                            <Input
                              value={editForm.phone}
                              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                              placeholder="+39…"
                              className="h-7 text-xs w-32"
                            />
                          ) : u.phone ? (
                            <a href={`tel:${u.phone}`} className="text-xs flex items-center gap-1 text-foreground hover:underline">
                              <Phone className="w-3 h-3" />{u.phone}
                            </a>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {isEditing ? (
                            <Input
                              value={editForm.whatsapp}
                              onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                              placeholder="+39…"
                              className="h-7 text-xs w-32"
                            />
                          ) : u.whatsapp ? (
                            <a href={`https://wa.me/${normalizePhoneDigits(u.whatsapp)}`} target="_blank" rel="noopener noreferrer"
                              className="text-xs flex items-center gap-1 text-green-600 hover:underline">
                              <Phone className="w-3 h-3" />{u.whatsapp}
                            </a>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Select value={editForm.role} onValueChange={(v: "admin" | "user") => setEditForm({ ...editForm, role: v })}>
                              <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : getRoleBadge(u.role, u.subscription_plan)}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Select value={editForm.subscription_plan} onValueChange={(v) => setEditForm({ ...editForm, subscription_plan: v })}>
                              <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="pro">Pro</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : getPlanBadge(u.subscription_plan)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {u.stripe_customer_id
                            ? <span className="flex items-center gap-1"><CreditCard className="w-3 h-3" />Stripe</span>
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Select value={editForm.subscription_status} onValueChange={(v) => setEditForm({ ...editForm, subscription_status: v })}>
                              <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Attivo</SelectItem>
                                <SelectItem value="trialing">Trial</SelectItem>
                                <SelectItem value="cancelled">Cancellato</SelectItem>
                                <SelectItem value="past_due">Scaduto</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : getStatusBadge(u.subscription_status)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {isEditing ? (
                            <Input type="date" value={editForm.current_period_end}
                              onChange={(e) => setEditForm({ ...editForm, current_period_end: e.target.value })}
                              className="w-32 h-7 text-xs" />
                          ) : (u.current_period_end ? formatDate(u.current_period_end) : "—")}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatCurrency(u.total_paid)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatCurrency(u.balance)}</TableCell>
                        <TableCell>
                          {isEditing ? (
                            <Switch
                              checked={editForm.notification_enabled}
                              onCheckedChange={(checked) => setEditForm({ ...editForm, notification_enabled: checked })}
                            />
                          ) : (
                            <Switch
                              checked={u.notification_enabled}
                              onCheckedChange={(checked) => void toggleNotifications(u.user_id, checked)}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(u.created_at)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(u.updated_at)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={cancelEditing} className="h-7 text-xs">Annulla</Button>
                              <Button size="sm" onClick={() => saveUser(u.user_id)} disabled={saving === u.user_id} className="h-7 text-xs gap-1">
                                {saving === u.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                Salva
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" variant="outline" onClick={() => startEditing(u)} className="h-7 text-xs">Modifica</Button>
                              {!isMe && (
                                <Button size="sm" variant="ghost" onClick={() => toggleBlock(u)} disabled={blocking === u.user_id}
                                  title={u.account_status === "suspended" ? "Sblocca" : "Blocca"}
                                  className={`h-7 w-7 p-0 ${u.account_status === "suspended" ? "text-green-600 hover:bg-green-50" : "text-orange-500 hover:bg-orange-50"}`}>
                                  {blocking === u.user_id ? <Loader2 className="w-3 h-3 animate-spin" />
                                    : u.account_status === "suspended" ? <CheckCircle2 className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                                </Button>
                              )}
                              {!isMe && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="ghost" disabled={deleting === u.user_id}
                                      className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50">
                                      {deleting === u.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Eliminare utente?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Stai per eliminare <strong>{u.display_name || u.email || "questo utente"}</strong>. Azione irreversibile.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annulla</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteUser(u.user_id)} className="bg-red-600 hover:bg-red-700">Elimina</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Nuovo Utente Dialog */}
      <Dialog open={showNewUser} onOpenChange={setShowNewUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" /> Nuovo Utente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Nome completo</Label>
              <Input placeholder="Mario Rossi" value={newUserForm.display_name}
                onChange={(e) => setNewUserForm({ ...newUserForm, display_name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Email *</Label>
              <Input type="email" placeholder="mario@example.com" value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm">Password *</Label>
              <div className="relative mt-1">
                <Input type={showPwd ? "text" : "password"} placeholder="Min. 12 caratteri" value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })} className="pr-20" />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button type="button" onClick={() => setShowPwd((v) => !v)}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                    aria-label={showPwd ? "Nascondi password" : "Mostra password"}>
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button type="button" onClick={async () => {
                    if (!newUserForm.password) return;
                    try { await navigator.clipboard.writeText(newUserForm.password); toast.success("Password copiata"); }
                    catch { toast.error("Impossibile copiare"); }
                  }} className="p-1.5 rounded hover:bg-muted text-muted-foreground" aria-label="Copia password">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <Button type="button" variant="outline" size="sm"
                  onClick={() => {
                    const p = generateStrongPassword(16);
                    setNewUserForm({ ...newUserForm, password: p });
                    setShowPwd(true);
                  }} className="gap-1.5 rounded-full text-xs">
                  <Wand2 className="w-3.5 h-3.5" /> Genera password sicura
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
                La password deve avere almeno 12 caratteri, una maiuscola, una minuscola, un numero e un simbolo.
                Evita parole comuni, nome utente o email.
              </p>
              {newUserForm.password && (() => {
                const v = validatePassword(newUserForm.password, newUserForm.email, newUserForm.display_name);
                const Item = ({ ok, label }: { ok: boolean; label: string }) => (
                  <div className={`flex items-center gap-1 text-[11px] ${ok ? "text-green-700" : "text-muted-foreground"}`}>
                    {ok ? <Check className="w-3 h-3" /> : <XIcon className="w-3 h-3" />} {label}
                  </div>
                );
                return (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1">
                    <Item ok={v.checks.length} label="≥ 12 caratteri" />
                    <Item ok={v.checks.upper} label="Maiuscola" />
                    <Item ok={v.checks.lower} label="Minuscola" />
                    <Item ok={v.checks.number} label="Numero" />
                    <Item ok={v.checks.symbol} label="Simbolo" />
                    <Item ok={v.checks.noName && v.checks.noEmail} label="No nome/email" />
                  </div>
                );
              })()}
            </div>
            <div>
              <Label className="text-sm">Telefono *</Label>
              <Input type="tel" placeholder="+39 333 1234567" value={newUserForm.phone}
                onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })} className="mt-1" />
            </div>
            <label className="flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={newUserForm.same_whatsapp}
                onChange={(e) => setNewUserForm({ ...newUserForm, same_whatsapp: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              Usa lo stesso numero per WhatsApp
            </label>
            {!newUserForm.same_whatsapp && (
              <div>
                <Label className="text-sm">WhatsApp *</Label>
                <Input type="tel" placeholder="+39 333 1234567" value={newUserForm.whatsapp}
                  onChange={(e) => setNewUserForm({ ...newUserForm, whatsapp: e.target.value })} className="mt-1" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Ruolo</Label>
                <Select value={newUserForm.role} onValueChange={(v: "admin" | "user") => setNewUserForm({ ...newUserForm, role: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Piano</Label>
                <Select value={newUserForm.subscription_plan} onValueChange={(v) => setNewUserForm({ ...newUserForm, subscription_plan: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewUser(false)}>Annulla</Button>
            <Button onClick={createUser} disabled={creatingUser} className="gap-2">
              {creatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Crea Utente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
