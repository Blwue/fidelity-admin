import { useState, useEffect } from "react";
import { supabase, loadShopClients, loadShopTransactions, loadShopStats, findClientByQR, addPointsToClient, saveShopSettings, saveShopRewards } from "./supabase";

export default function App() {
  const [admin, setAdmin] = useState(null);
  const [shop, setShop] = useState(null);
  const [clients, setClients] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [view, setView] = useState("dashboard");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [notif, setNotif] = useState(null);
  const [qrInput, setQrInput] = useState("");
  const [foundClient, setFoundClient] = useState(null);
  const [amount, setAmount] = useState("");
  const [ticketNum, setTicketNum] = useState("");
  const [cashierStep, setCashierStep] = useState("scan");
  const [editSettings, setEditSettings] = useState(false);
  const [shopForm, setShopForm] = useState({});
  const [rewards, setRewards] = useState([]);
  const [showAddReward, setShowAddReward] = useState(false);
  const [newReward, setNewReward] = useState({ type: "fixed", name: "", points: 100, emoji: "🎁", desc: "", value: 10 });

  const showNotif = (msg, type = "success") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3000);
  };

  const doLogin = async () => {
    if (!email || !pwd) { showNotif("Remplissez tous les champs", "error"); return; }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    if (error) { showNotif("Email ou mot de passe incorrect", "error"); return; }
    const { data: shopData, error: shopError } = await supabase
      .from("shops").select("*").eq("owner_id", data.user.id).single();
    if (shopError || !shopData) {
      showNotif("Aucune boutique trouvée pour ce compte", "error");
      await supabase.auth.signOut(); return;
    }
    setAdmin({ name: data.user.email.split("@")[0], email: data.user.email, id: data.user.id });
    setShop(shopData);
    setShopForm({ name: shopData.name, category: shopData.category, color: shopData.color, points_per_euro: shopData.points_per_euro, emoji: shopData.emoji });
    setRewards(shopData.rewards || []);
    showNotif("Bienvenue !");
  };

  useEffect(() => {
    if (!shop) return;
    const loadData = async () => {
      const [c, t, s] = await Promise.all([
        loadShopClients(shop.id),
        loadShopTransactions(shop.id),
        loadShopStats(shop.id)
      ]);
      setClients(c); setTransactions(t); setStats(s);
    };
    loadData();
  }, [shop]);

  const scanQR = async () => {
    const parts = qrInput.split("-");
    if (parts.length < 3) { showNotif("QR invalide", "error"); return; }
    const userId = parts.slice(1, -1).join("-");
    const client = await findClientByQR(userId);
    if (!client) { showNotif("Client introuvable", "error"); return; }
    setFoundClient(client); setCashierStep("amount");
  };

  const addPoints = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { showNotif("Montant invalide", "error"); return; }
    if (!ticketNum) { showNotif("Numéro de ticket obligatoire", "error"); return; }
    const pts = Math.round(amt * shop.points_per_euro);
    const existing = foundClient.shopPoints?.find(p => p.shop_id === shop.id);
    const newPoints = (existing?.points || 0) + pts;
    const newVisits = (existing?.total_visits || 0) + 1;
    const newSpent = (existing?.total_spent || 0) + amt;
    await addPointsToClient(foundClient.id, shop.id, pts, amt, newSpent, newVisits, ticketNum);
    showNotif(`✅ +${pts} pts ajoutés à ${foundClient.name} !`);
    setCashierStep("done");
    const [c, t, s] = await Promise.all([loadShopClients(shop.id), loadShopTransactions(shop.id), loadShopStats(shop.id)]);
    setClients(c); setTransactions(t); setStats(s);
  };

  const saveSettings = async () => {
    const ok = await saveShopSettings(shop.id, {
      name: shopForm.name,
      category: shopForm.category,
      color: shopForm.color,
      points_per_euro: parseInt(shopForm.points_per_euro),
      emoji: shopForm.emoji
    });
    if (ok) {
      setShop({ ...shop, ...shopForm });
      setEditSettings(false);
      showNotif("Paramètres sauvegardés !");
    } else showNotif("Erreur lors de la sauvegarde", "error");
  };

  const addReward = () => {
    if (!newReward.name || !newReward.points) { showNotif("Remplissez tous les champs", "error"); return; }
    const updated = [...rewards, { ...newReward, id: Date.now(), points: parseInt(newReward.points) }];
    setRewards(updated);
    setShowAddReward(false);
    setNewReward({ type: "fixed", name: "", points: 100, emoji: "🎁", desc: "", value: 10 });
  };

  const removeReward = (id) => setRewards(rewards.filter(r => r.id !== id));

  const saveRewards = async () => {
    const ok = await saveShopRewards(shop.id, rewards);
    if (ok) { setShop({ ...shop, rewards }); showNotif("Récompenses sauvegardées !"); }
    else showNotif("Erreur lors de la sauvegarde", "error");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setAdmin(null); setShop(null);
  };

  const s = {
    bg: { minHeight: "100vh", background: "#07070A", color: "#F2F2F2", fontFamily: "'Outfit',sans-serif" },
    card: { background: "#16161D", borderRadius: 16, padding: 20, border: "1px solid rgba(255,255,255,0.06)", marginBottom: 16 },
    input: { width: "100%", background: "#0F0F14", border: "1px solid rgba(255,255,255,0.08)", color: "#F2F2F2", padding: "12px 14px", borderRadius: 12, fontSize: 14, fontFamily: "'Outfit',sans-serif", outline: "none", marginBottom: 12 },
    btn: (color = "#FF3D00") => ({ width: "100%", padding: "13px", background: color, border: "none", color: "#fff", fontFamily: "'Outfit',sans-serif", fontSize: 14, fontWeight: 700, borderRadius: 14, cursor: "pointer", marginBottom: 8 }),
    btnSm: (color = "#FF3D00") => ({ padding: "8px 14px", background: color, border: "none", color: "#fff", fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 700, borderRadius: 10, cursor: "pointer" }),
    label: { display: "block", fontSize: 11, color: "#888", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6, fontWeight: 500 },
    statBox: { background: "#1E1E27", borderRadius: 14, padding: 16, textAlign: "center", border: "1px solid rgba(255,255,255,0.05)" },
  };

  if (!admin) return (
    <div style={{ ...s.bg, display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 24px", maxWidth: 440, margin: "0 auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
      {notif && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: notif.type === "error" ? "#E63946" : "#2DC653", color: "#fff", padding: "10px 24px", borderRadius: 100, fontSize: 13, fontWeight: 700, zIndex: 100 }}>{notif.msg}</div>}
      <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 4 }}>Fidelity<span style={{ color: "#FF3D00" }}>.</span><span style={{ fontSize: 16, color: "#555", fontWeight: 500 }}> Admin</span></div>
      <div style={{ fontSize: 13, color: "#555", marginBottom: 40 }}>Espace commerçant</div>
      <div style={s.card}>
        <label style={s.label}>Email</label>
        <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="patron@restaurant.fr" />
        <label style={s.label}>Mot de passe</label>
        <input style={s.input} type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="••••••••" />
        <button style={s.btn()} onClick={doLogin}>Se connecter</button>
      </div>
    </div>
  );

  return (
    <div style={s.bg}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
      {notif && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: notif.type === "error" ? "#E63946" : "#2DC653", color: "#fff", padding: "10px 24px", borderRadius: 100, fontSize: 13, fontWeight: 700, zIndex: 100, whiteSpace: "nowrap" }}>{notif.msg}</div>}

      <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "#0D0D12" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{shop.emoji} {shop.name}</div>
          <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{admin.email}</div>
        </div>
        <button onClick={logout} style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", color: "#888", padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 13 }}>Déconnexion</button>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "12px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" }}>
        {[{ id: "dashboard", label: "📊 Dashboard" }, { id: "cashier", label: "💳 Caissier" }, { id: "clients", label: "👥 Clients" }, { id: "transactions", label: "📋 Transactions" }, { id: "settings", label: "⚙️ Paramètres" }].map(tab => (
          <button key={tab.id} onClick={() => setView(tab.id)} style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", background: view === tab.id ? "#FF3D00" : "#16161D", color: view === tab.id ? "#fff" : "#888", cursor: "pointer", fontFamily: "'Outfit',sans-serif", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{tab.label}</button>
        ))}
      </div>

      <div style={{ padding: "24px", maxWidth: 900, margin: "0 auto" }}>

        {/* DASHBOARD */}
        {view === "dashboard" && <>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Vue d'ensemble</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Clients", value: stats?.totalClients || 0, icon: "👥" },
              { label: "Transactions", value: stats?.totalTransactions || 0, icon: "📋" },
              { label: "CA total", value: (stats?.totalRevenue || 0).toFixed(2) + "€", icon: "💰" },
              { label: "Points distribués", value: stats?.totalPoints || 0, icon: "⭐" },
            ].map((s2, i) => (
              <div key={i} style={s.statBox}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{s2.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{s2.value}</div>
                <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 1, marginTop: 4 }}>{s2.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Dernières transactions</div>
          {transactions.slice(0, 5).map((t, i) => (
            <div key={i} style={{ ...s.card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.profiles?.name || "Client"}</div>
                <div style={{ fontSize: 11, color: "#555" }}>{new Date(t.created_at).toLocaleDateString("fr")} {t.ticket_number && `· Ticket ${t.ticket_number}`}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{t.amount?.toFixed(2)}€</div>
                <div style={{ fontSize: 12, color: "#FF3D00", fontWeight: 600 }}>+{t.points_earned} pts</div>
              </div>
            </div>
          ))}
        </>}

        {/* CAISSIER */}
        {view === "cashier" && <>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Mode Caissier</div>
          <div style={s.card}>
            {cashierStep === "scan" && <>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 48 }}>📷</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8 }}>Scanner le QR client</div>
                <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>Ou entrez le code manuellement</div>
              </div>
              <label style={s.label}>Code QR</label>
              <input style={s.input} value={qrInput} onChange={e => setQrInput(e.target.value)} placeholder="FID-userId-shopId" />
              <button style={s.btn()} onClick={scanQR}>Valider le QR</button>
            </>}

            {cashierStep === "amount" && foundClient && <>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, padding: 14, background: "#0F0F14", borderRadius: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#FF3D0022", color: "#FF3D00", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800 }}>{foundClient.name?.charAt(0)}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{foundClient.name}</div>
                  <div style={{ fontSize: 12, color: "#555" }}>{foundClient.shopPoints?.find(p => p.shop_id === shop.id)?.points || 0} pts actuels</div>
                </div>
              </div>
              <label style={s.label}>Montant de la commande (€)</label>
              <input style={s.input} type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ex: 25.50" />
              <label style={s.label}>Numéro de ticket</label>
              <input style={s.input} value={ticketNum} onChange={e => setTicketNum(e.target.value)} placeholder="Ex: #00142" />
              {amount && <div style={{ textAlign: "center", padding: 12, background: "#FF3D0015", borderRadius: 12, marginBottom: 12, color: "#FF3D00", fontWeight: 700 }}>= +{Math.round(parseFloat(amount || 0) * shop.points_per_euro)} points</div>}
              <button style={s.btn()} onClick={addPoints}>Valider ✓</button>
              <button style={s.btn("#1E1E27")} onClick={() => { setCashierStep("scan"); setFoundClient(null); setQrInput(""); }}>← Retour</button>
            </>}

            {cashierStep === "done" && (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 56 }}>✅</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 12 }}>Points ajoutés !</div>
                <div style={{ fontSize: 13, color: "#555", marginTop: 4, marginBottom: 24 }}>{foundClient?.name} a reçu ses points</div>
                <button style={s.btn()} onClick={() => { setCashierStep("scan"); setFoundClient(null); setQrInput(""); setAmount(""); setTicketNum(""); }}>Nouveau client →</button>
              </div>
            )}
          </div>
        </>}

        {/* CLIENTS */}
        {view === "clients" && <>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Clients ({clients.length})</div>
          {clients.length === 0 ? (
            <div style={{ ...s.card, textAlign: "center", color: "#555", padding: 40 }}>Aucun client encore</div>
          ) : clients.map((c, i) => (
            <div key={i} style={{ ...s.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#FF3D0022", color: "#FF3D00", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>{c.profiles?.name?.charAt(0) || "?"}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{c.profiles?.name || "Inconnu"}</div>
                  <div style={{ fontSize: 12, color: "#555" }}>{c.total_visits || 0} visites · {(c.total_spent || 0).toFixed(2)}€ dépensés</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#FFD700" }}>{c.points}</div>
                <div style={{ fontSize: 11, color: "#555" }}>points</div>
              </div>
            </div>
          ))}
        </>}

        {/* TRANSACTIONS */}
        {view === "transactions" && <>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Transactions</div>
          {transactions.map((t, i) => (
            <div key={i} style={{ ...s.card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.profiles?.name || "Client"}</div>
                <div style={{ fontSize: 11, color: "#555" }}>{new Date(t.created_at).toLocaleDateString("fr")} à {new Date(t.created_at).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })} {t.ticket_number && `· ${t.ticket_number}`}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{t.amount?.toFixed(2)}€</div>
                <div style={{ fontSize: 12, color: "#FF3D00", fontWeight: 600 }}>+{t.points_earned} pts</div>
              </div>
            </div>
          ))}
        </>}

        {/* PARAMÈTRES */}
        {view === "settings" && <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 20, fontWeight: 800 }}>Paramètres</div>
            {!editSettings && <button style={s.btnSm()} onClick={() => setEditSettings(true)}>Modifier</button>}
          </div>

          <div style={s.card}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Ma boutique</div>
            {editSettings ? (
              <>
                {[["Nom", "name", "text"], ["Emoji", "emoji", "text"], ["Catégorie", "category", "text"], ["Points par €", "points_per_euro", "number"]].map(([label, key, type]) => (
                  <div key={key}>
                    <label style={s.label}>{label}</label>
                    <input style={s.input} type={type} value={shopForm[key] || ""} onChange={e => setShopForm({ ...shopForm, [key]: e.target.value })} />
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...s.btnSm(), flex: 1, padding: 12 }} onClick={saveSettings}>Sauvegarder</button>
                  <button style={{ ...s.btnSm("#1E1E27"), flex: 1, padding: 12 }} onClick={() => setEditSettings(false)}>Annuler</button>
                </div>
              </>
            ) : (
              [{ label: "Nom", value: shop.name }, { label: "Emoji", value: shop.emoji }, { label: "Catégorie", value: shop.category }, { label: "Points par €", value: shop.points_per_euro + " pt/€" }].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", fontSize: 13 }}>
                  <span style={{ color: "#555" }}>{row.label}</span>
                  <span style={{ fontWeight: 600 }}>{row.value}</span>
                </div>
              ))
            )}
          </div>

          <div style={s.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Récompenses</div>
              <button style={s.btnSm()} onClick={() => setShowAddReward(!showAddReward)}>+ Ajouter</button>
            </div>

            {showAddReward && (
              <div style={{ background: "#0F0F14", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Nouvelle récompense</div>
                {[["Nom", "name", "text"], ["Emoji", "emoji", "text"], ["Points requis", "points", "number"], ["Description", "desc", "text"]].map(([label, key, type]) => (
                  <div key={key}>
                    <label style={s.label}>{label}</label>
                    <input style={s.input} type={type} value={newReward[key] || ""} onChange={e => setNewReward({ ...newReward, [key]: e.target.value })} />
                  </div>
                ))}
                <div>
                  <label style={s.label}>Type</label>
                  <select style={s.input} value={newReward.type} onChange={e => setNewReward({ ...newReward, type: e.target.value })}>
                    <option value="fixed">Offre fixe (ex: café offert)</option>
                    <option value="percent">Remise % (ex: -10%)</option>
                  </select>
                </div>
                {newReward.type === "percent" && (
                  <div>
                    <label style={s.label}>Valeur (%)</label>
                    <input style={s.input} type="number" value={newReward.value} onChange={e => setNewReward({ ...newReward, value: parseInt(e.target.value) })} />
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{ ...s.btnSm(), flex: 1, padding: 12 }} onClick={addReward}>Ajouter</button>
                  <button style={{ ...s.btnSm("#1E1E27"), flex: 1, padding: 12 }} onClick={() => setShowAddReward(false)}>Annuler</button>
                </div>
              </div>
            )}

            {rewards.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize: 13 }}>{r.emoji} {r.name} {r.type === "percent" && `(-${r.value}%)`}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "#FF3D00", fontWeight: 700, fontSize: 13 }}>{r.points} pts</span>
                  <button onClick={() => removeReward(r.id)} style={{ background: "none", border: "none", color: "#E63946", cursor: "pointer", fontSize: 16 }}>✕</button>
                </div>
              </div>
            ))}

            {rewards.length > 0 && (
              <button style={{ ...s.btn(), marginTop: 16 }} onClick={saveRewards}>Sauvegarder les récompenses</button>
            )}
          </div>
        </>}
      </div>
    </div>
  );
}