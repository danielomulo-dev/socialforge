import { useState, useEffect, useRef } from "react";

const TABS = [
  { id: "brand", label: "Brand & Goals", icon: "◆" },
  { id: "calendar", label: "Content Calendar", icon: "▦" },
  { id: "create", label: "Create Content", icon: "✦" },
  { id: "images", label: "Image Studio", icon: "◐" },
  { id: "campaigns", label: "Campaigns", icon: "⚡" },
  { id: "analytics", label: "Analytics", icon: "◈" },
  { id: "review", label: "Review & Adapt", icon: "↻" },
  { id: "settings", label: "Settings", icon: "⚙" },
];

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PLATFORMS = ["Instagram","Facebook","Twitter/X","LinkedIn","TikTok"];
const POST_TYPES = ["Image Post","Carousel","Story","Reel/Video","Text Post","Poll"];

/* ─── localStorage wrapper ─── */
const store = {
  get(k) { try { const v = localStorage.getItem("sf_" + k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(k, v) { try { localStorage.setItem("sf_" + k, JSON.stringify(v)); } catch(e) { console.error(e); } },
  del(k) { localStorage.removeItem("sf_" + k); },
};

/* ─── Gemini AI ─── */
async function askAgent(systemPrompt, userPrompt, apiKey) {
  if (!apiKey) return "⚠ Please add your Gemini API key in the Settings tab first.";
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return `⚠ Gemini error (${res.status}): ${err?.error?.message || "Check your API key."}`;
    }
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.map(p => p.text).join("\n") || "No response.";
  } catch (e) {
    return "⚠ Network error: " + e.message;
  }
}

function useApiKey() {
  const [key, setKey] = useState(() => store.get("gemini_key") || "");
  useEffect(() => {
    const interval = setInterval(() => {
      const k = store.get("gemini_key");
      if (k && k !== key) setKey(k);
    }, 1000);
    return () => clearInterval(interval);
  }, [key]);
  return key;
}

/* ─── Shared UI ─── */
function Btn({ children, onClick, variant = "primary", small, disabled, style }) {
  const base = { padding: small ? "6px 14px" : "10px 22px", border: "none", borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer", fontFamily: "'DM Sans',sans-serif", fontWeight: 600, fontSize: small ? 12 : 14, transition: "all .2s", opacity: disabled ? 0.5 : 1, ...style };
  const v = { primary: { background: "#E85D26", color: "#fff" }, secondary: { background: "rgba(232,93,38,0.12)", color: "#E85D26" }, ghost: { background: "transparent", color: "#94a3b8", border: "1px solid #334155" }, ai: { background: "linear-gradient(135deg,#E85D26,#F59E0B)", color: "#fff" } };
  return <button style={{ ...base, ...v[variant] }} onClick={onClick} disabled={disabled}>{children}</button>;
}
function Card({ children, style }) { return <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 24, ...style }}>{children}</div>; }
function TextArea({ value, onChange, placeholder, rows = 4, style }) { return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ width: "100%", background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0", padding: 12, fontFamily: "'DM Sans',sans-serif", fontSize: 14, resize: "vertical", outline: "none", boxSizing: "border-box", ...style }} />; }
function Input({ value, onChange, placeholder, type, style }) { return <input type={type||"text"} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ width: "100%", background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0", padding: "10px 12px", fontFamily: "'DM Sans',sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box", ...style }} />; }
function Select({ value, onChange, options }) { return <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", background: "#0a0f1a", border: "1px solid #1e293b", borderRadius: 8, color: "#e2e8f0", padding: "10px 12px", fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>{options.map(o => <option key={o}>{o}</option>)}</select>; }
function Label({ children }) { return <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{children}</div>; }
function AiBox({ text, loading }) { return <div style={{ background: "linear-gradient(135deg, rgba(232,93,38,0.08), rgba(245,158,11,0.06))", border: "1px solid rgba(232,93,38,0.25)", borderRadius: 10, padding: 18, color: "#e2e8f0", fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap", minHeight: 60, fontFamily: "'DM Sans',sans-serif" }}>{loading ? <span style={{ color: "#E85D26", animation: "pulse 1.5s infinite" }}>● Gemini is thinking...</span> : (text || <span style={{ color: "#475569" }}>AI response will appear here...</span>)}</div>; }
function Tags({ items, selected, onToggle }) { return <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{items.map(t => <span key={t} onClick={() => onToggle(t)} style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", background: selected.includes(t) ? "#E85D26" : "rgba(255,255,255,0.05)", color: selected.includes(t) ? "#fff" : "#94a3b8", border: `1px solid ${selected.includes(t) ? "#E85D26" : "#1e293b"}`, transition: "all .2s" }}>{t}</span>)}</div>; }

/* ─── Settings ─── */
function SettingsTab() {
  const [key, setKey] = useState(() => store.get("gemini_key") || "");
  const [saved, setSaved] = useState(false);
  const [visible, setVisible] = useState(false);
  const save = () => { store.set("gemini_key", key); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ color: "#E85D26", margin: 0, fontFamily: "'Playfair Display',serif" }}>Settings</h2>
      <Card>
        <Label>Gemini API Key</Label>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
          Get your free key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" style={{ color: "#E85D26", textDecoration: "none" }}>aistudio.google.com/apikey</a>. Stored in your browser only — never sent anywhere except Google's API.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <Input value={key} onChange={setKey} placeholder="AIza..." type={visible ? "text" : "password"} style={{ flex: 1 }} />
          <Btn small variant="ghost" onClick={() => setVisible(!visible)}>{visible ? "Hide" : "Show"}</Btn>
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 12, alignItems: "center" }}>
          <Btn onClick={save}>Save Key</Btn>
          {saved && <span style={{ color: "#22c55e", fontSize: 13 }}>✓ Saved</span>}
        </div>
      </Card>
      <Card>
        <Label>Model</Label>
        <p style={{ color: "#cbd5e1", fontSize: 14 }}>Gemini 2.0 Flash — fast, capable, generous free tier</p>
      </Card>
      <Card>
        <Label>Reset All Data</Label>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 12 }}>Clear everything: brand, calendar, copies, campaigns, metrics, API key.</p>
        <Btn small variant="ghost" onClick={() => { const keys = ["brand","calendar","copies","imagePrompts","campaigns","metrics","gemini_key"]; keys.forEach(k => store.del(k)); window.location.reload(); }} style={{ color: "#ef4444", borderColor: "#ef4444" }}>Reset All Data</Btn>
      </Card>
    </div>
  );
}

/* ─── Brand ─── */
function BrandTab() {
  const [brand, setBrand] = useState(() => store.get("brand") || { name: "", description: "", audience: "", tone: "", goals: "", platforms: [] });
  const [saved, setSaved] = useState(false);
  const save = () => { store.set("brand", brand); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const toggle = p => setBrand(b => ({ ...b, platforms: b.platforms.includes(p) ? b.platforms.filter(x=>x!==p) : [...b.platforms, p] }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ color: "#E85D26", margin: 0, fontFamily: "'Playfair Display',serif" }}>Brand & Product Profile</h2>
      <Card><Label>Brand / Product Name</Label><Input value={brand.name} onChange={v => setBrand(b=>({...b,name:v}))} placeholder="e.g. Empower Africa" /></Card>
      <Card><Label>Product Description</Label><TextArea value={brand.description} onChange={v => setBrand(b=>({...b,description:v}))} placeholder="Describe your product, value proposition, key features..." rows={5} /></Card>
      <Card><Label>Target Audience</Label><TextArea value={brand.audience} onChange={v => setBrand(b=>({...b,audience:v}))} placeholder="Demographics, interests, pain points..." rows={3} /></Card>
      <Card><Label>Brand Voice & Tone</Label><TextArea value={brand.tone} onChange={v => setBrand(b=>({...b,tone:v}))} placeholder="Professional, friendly, bold..." rows={2} /></Card>
      <Card><Label>Marketing Goals</Label><TextArea value={brand.goals} onChange={v => setBrand(b=>({...b,goals:v}))} placeholder="Brand awareness, leads, sales..." rows={3} /></Card>
      <Card><Label>Active Platforms</Label><Tags items={PLATFORMS} selected={brand.platforms} onToggle={toggle} /></Card>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}><Btn onClick={save}>Save Profile</Btn>{saved && <span style={{ color: "#22c55e", fontSize: 13 }}>✓ Saved</span>}</div>
    </div>
  );
}

/* ─── Calendar ─── */
function CalendarTab() {
  const apiKey = useApiKey();
  const [entries, setEntries] = useState(() => store.get("calendar") || []);
  const [form, setForm] = useState({ date: "", platform: "Instagram", type: "Image Post", caption: "" });
  const [aiSuggestions, setAiSuggestions] = useState("");
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth());

  useEffect(() => { store.set("calendar", entries); }, [entries]);

  const addEntry = () => { if (!form.date) return; setEntries(e => [...e, { ...form, id: Date.now() }]); setForm(f => ({ ...f, caption: "", date: "" })); };

  const getMonthlyPlan = async () => {
    setLoading(true);
    const brand = store.get("brand");
    const ctx = brand ? `Brand: ${brand.name}. ${brand.description}. Audience: ${brand.audience}. Tone: ${brand.tone}. Goals: ${brand.goals}. Platforms: ${brand.platforms.join(", ")}.` : "No brand info.";
    const r = await askAgent("You are a social media strategist. Give a detailed monthly content calendar with specific post ideas, dates, platforms, and content types.", `${ctx}\n\nCreate a content plan for ${MONTHS[month]} with 12-16 post ideas. For each: date, platform, content type, and brief caption/concept.`, apiKey);
    setAiSuggestions(r); setLoading(false);
  };

  const filtered = entries.filter(e => new Date(e.date).getMonth() === month);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <h2 style={{ color: "#E85D26", margin: 0, fontFamily: "'Playfair Display',serif" }}>Content Calendar</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Btn small variant="ghost" onClick={() => setMonth(m=>(m-1+12)%12)}>←</Btn>
          <span style={{ color: "#e2e8f0", fontWeight: 700, minWidth: 40, textAlign: "center" }}>{MONTHS[month]}</span>
          <Btn small variant="ghost" onClick={() => setMonth(m=>(m+1)%12)}>→</Btn>
        </div>
      </div>
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div><Label>Date</Label><Input value={form.date} onChange={v=>setForm(f=>({...f,date:v}))} type="date" /></div>
          <div><Label>Platform</Label><Select value={form.platform} onChange={v=>setForm(f=>({...f,platform:v}))} options={PLATFORMS} /></div>
          <div><Label>Type</Label><Select value={form.type} onChange={v=>setForm(f=>({...f,type:v}))} options={POST_TYPES} /></div>
        </div>
        <div style={{ marginTop: 12 }}><Label>Caption / Concept</Label><TextArea value={form.caption} onChange={v=>setForm(f=>({...f,caption:v}))} placeholder="Post idea or caption..." rows={2} /></div>
        <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
          <Btn onClick={addEntry} small>+ Add to Calendar</Btn>
          <Btn onClick={getMonthlyPlan} variant="ai" small disabled={loading}>✦ AI Monthly Plan</Btn>
        </div>
      </Card>
      {aiSuggestions && <Card><Label>AI Plan for {MONTHS[month]}</Label><AiBox text={aiSuggestions} loading={loading} /></Card>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 && <div style={{ color: "#475569", textAlign: "center", padding: 30 }}>No entries for {MONTHS[month]}</div>}
        {filtered.sort((a,b)=>a.date.localeCompare(b.date)).map(e => (
          <Card key={e.id} style={{ padding: 14, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ color: "#E85D26", fontWeight: 700, fontSize: 13 }}>{e.date}</span>
                <span style={{ background: "rgba(232,93,38,0.15)", color: "#E85D26", padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600 }}>{e.platform}</span>
                <span style={{ color: "#64748b", fontSize: 11 }}>{e.type}</span>
              </div>
              <div style={{ color: "#cbd5e1", fontSize: 13, marginTop: 6 }}>{e.caption}</div>
            </div>
            <span onClick={() => setEntries(es=>es.filter(x=>x.id!==e.id))} style={{ color: "#475569", cursor: "pointer", fontSize: 16 }}>×</span>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─── Create Content ─── */
function CreateTab() {
  const apiKey = useApiKey();
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState("Instagram");
  const [type, setType] = useState("Promotional");
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState("");
  const [history, setHistory] = useState(() => store.get("copies") || []);

  const generate = async () => {
    setLoading(true);
    const brand = store.get("brand");
    const ctx = brand ? `Brand: ${brand.name}. ${brand.description}. Audience: ${brand.audience}. Tone: ${brand.tone}.` : "";
    const r = await askAgent(`You are an expert social media copywriter. Write compelling, platform-optimized copy. Include hashtags. ${ctx}`, `Platform: ${platform}\nType: ${type}\nBrief: ${prompt}\n\nWrite 3 variations labeled Option A, B, C.`, apiKey);
    setResult(r); setEditText(r); setLoading(false);
  };

  const saveCopy = () => {
    const entry = { id: Date.now(), platform, type, text: editMode ? editText : result, date: new Date().toISOString().split("T")[0] };
    const updated = [entry, ...history].slice(0, 50);
    setHistory(updated); store.set("copies", updated);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ color: "#E85D26", margin: 0, fontFamily: "'Playfair Display',serif" }}>Create Social Media Copy</h2>
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><Label>Platform</Label><Select value={platform} onChange={setPlatform} options={PLATFORMS} /></div>
          <div><Label>Content Type</Label><Select value={type} onChange={setType} options={["Promotional","Educational","Engagement","Behind the Scenes","Announcement","Testimonial","User Generated"]} /></div>
        </div>
        <Label>Brief / Prompt</Label>
        <TextArea value={prompt} onChange={setPrompt} placeholder="Describe what this post should be about..." rows={3} />
        <div style={{ marginTop: 12 }}><Btn onClick={generate} variant="ai" disabled={loading || !prompt}>✦ Generate Copy</Btn></div>
      </Card>
      {(result || loading) && (
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <Label>Generated Copy</Label>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn small variant="ghost" onClick={() => { setEditMode(!editMode); if (!editMode) setEditText(result); }}>{editMode ? "Preview" : "Edit"}</Btn>
              <Btn small variant="secondary" onClick={saveCopy}>Save</Btn>
            </div>
          </div>
          {editMode ? <TextArea value={editText} onChange={setEditText} rows={10} /> : <AiBox text={result} loading={loading} />}
        </Card>
      )}
      {history.length > 0 && (
        <Card>
          <Label>Saved Copies</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, maxHeight: 300, overflowY: "auto" }}>
            {history.map(h => (
              <div key={h.id} style={{ background: "#0a0f1a", borderRadius: 8, padding: 12, fontSize: 13, color: "#cbd5e1" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 6 }}><span style={{ color: "#E85D26", fontWeight: 600, fontSize: 11 }}>{h.platform}</span><span style={{ color: "#475569", fontSize: 11 }}>{h.date}</span></div>
                <div style={{ whiteSpace: "pre-wrap", maxHeight: 80, overflow: "hidden" }}>{h.text}</div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ─── Image Studio ─── */
function ImageTab() {
  const [images, setImages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [prompts, setPrompts] = useState(() => store.get("imagePrompts") || []);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const fileRef = useRef();

  const handleUpload = e => { Array.from(e.target.files).forEach(f => { const r = new FileReader(); r.onload = ev => setImages(i => [...i, { id: Date.now()+Math.random(), src: ev.target.result, name: f.name }]); r.readAsDataURL(f); }); };
  const savePrompt = () => { if (!prompt.trim()) return; const u = [{ id: Date.now(), text: prompt, date: new Date().toISOString().split("T")[0] }, ...prompts]; setPrompts(u); store.set("imagePrompts", u); setPrompt(""); };
  const saveEdit = id => { const u = prompts.map(p => p.id===id ? {...p, text: editText} : p); setPrompts(u); store.set("imagePrompts", u); setEditingId(null); };
  const deletePrompt = id => { const u = prompts.filter(p => p.id!==id); setPrompts(u); store.set("imagePrompts", u); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ color: "#E85D26", margin: 0, fontFamily: "'Playfair Display',serif" }}>Image Studio</h2>
      <Card>
        <Label>Upload Product Images</Label>
        <div onClick={() => fileRef.current.click()} style={{ border: "2px dashed #1e293b", borderRadius: 10, padding: 40, textAlign: "center", cursor: "pointer", color: "#475569" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>◐</div>
          <div style={{ fontSize: 14 }}>Click to upload images</div>
          <input ref={fileRef} type="file" multiple accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
        </div>
        {images.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 12, marginTop: 16 }}>
            {images.map(img => (
              <div key={img.id} style={{ position: "relative" }}>
                <img src={img.src} alt={img.name} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, border: "1px solid #1e293b" }} />
                <span onClick={() => setImages(i=>i.filter(x=>x.id!==img.id))} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.7)", color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, cursor: "pointer" }}>×</span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <Label>Image Generation Prompts (for Nano Banana or similar)</Label>
        <TextArea value={prompt} onChange={setPrompt} placeholder="Detailed prompt for AI image generation..." rows={3} />
        <div style={{ marginTop: 10 }}><Btn small onClick={savePrompt}>Save Prompt</Btn></div>
      </Card>
      {prompts.length > 0 && (
        <Card>
          <Label>Saved Prompts</Label>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {prompts.map(p => (
              <div key={p.id} style={{ background: "#0a0f1a", borderRadius: 8, padding: 14 }}>
                {editingId===p.id ? (<><TextArea value={editText} onChange={setEditText} rows={3} /><div style={{ display:"flex",gap:8,marginTop:8 }}><Btn small variant="secondary" onClick={()=>saveEdit(p.id)}>Save</Btn><Btn small variant="ghost" onClick={()=>setEditingId(null)}>Cancel</Btn></div></>) : (<><div style={{ color: "#cbd5e1", fontSize: 13, whiteSpace: "pre-wrap" }}>{p.text}</div><div style={{ display:"flex",gap:8,marginTop:8 }}><Btn small variant="ghost" onClick={()=>{setEditingId(p.id);setEditText(p.text);}}>Edit</Btn><Btn small variant="ghost" onClick={()=>deletePrompt(p.id)} style={{color:"#ef4444"}}>Delete</Btn><Btn small variant="ghost" onClick={()=>navigator.clipboard.writeText(p.text)}>Copy</Btn></div></>)}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ─── Campaigns ─── */
function CampaignsTab() {
  const apiKey = useApiKey();
  const [campaigns, setCampaigns] = useState(() => store.get("campaigns") || []);
  const [form, setForm] = useState({ name: "", goal: "", startMonth: 0, duration: 3, platforms: [], notes: "" });
  const [aiPlan, setAiPlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(null);

  useEffect(() => { store.set("campaigns", campaigns); }, [campaigns]);

  const add = () => { if (!form.name) return; setCampaigns(c => [...c, { ...form, id: Date.now() }]); setForm({ name: "", goal: "", startMonth: 0, duration: 3, platforms: [], notes: "" }); };

  const getPlan = async (c) => {
    setLoading(true); setSel(c.id);
    const brand = store.get("brand");
    const ctx = brand ? `Brand: ${brand.name}. ${brand.description}. Audience: ${brand.audience}. Tone: ${brand.tone}.` : "";
    const months = Array.from({ length: c.duration }, (_, i) => MONTHS[(c.startMonth + i) % 12]);
    const r = await askAgent("You are a senior social media strategist. Provide detailed month-by-month campaign execution plans.", `${ctx}\n\nCampaign: "${c.name}"\nGoal: ${c.goal}\nPlatforms: ${c.platforms.join(", ")}\nDuration: ${c.duration} months (${months.join(", ")})\nNotes: ${c.notes}\n\nMonth-by-month breakdown: themes, frequency, key dates, content types, KPIs.`, apiKey);
    setAiPlan(r); setLoading(false);
  };

  const toggle = p => setForm(f => ({ ...f, platforms: f.platforms.includes(p) ? f.platforms.filter(x=>x!==p) : [...f.platforms, p] }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ color: "#E85D26", margin: 0, fontFamily: "'Playfair Display',serif" }}>Campaign Manager</h2>
      <Card>
        <Label>New Campaign</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><Label>Name</Label><Input value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="Q2 Product Launch" /></div>
          <div><Label>Goal</Label><Input value={form.goal} onChange={v=>setForm(f=>({...f,goal:v}))} placeholder="10K followers" /></div>
          <div><Label>Start Month</Label><Select value={MONTHS[form.startMonth]} onChange={v=>setForm(f=>({...f,startMonth:MONTHS.indexOf(v)}))} options={MONTHS} /></div>
          <div><Label>Duration (months)</Label><Input value={form.duration} onChange={v=>setForm(f=>({...f,duration:+v||1}))} /></div>
        </div>
        <div style={{ marginTop: 12 }}><Label>Platforms</Label><Tags items={PLATFORMS} selected={form.platforms} onToggle={toggle} /></div>
        <div style={{ marginTop: 12 }}><Label>Notes</Label><TextArea value={form.notes} onChange={v=>setForm(f=>({...f,notes:v}))} placeholder="Additional context..." rows={2} /></div>
        <div style={{ marginTop: 12 }}><Btn small onClick={add}>+ Add Campaign</Btn></div>
      </Card>
      {campaigns.map(c => (
        <Card key={c.id} style={{ borderLeft: sel===c.id ? "3px solid #E85D26" : "3px solid #1e293b" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 16 }}>{c.name}</div>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>{c.goal} · {c.duration}mo from {MONTHS[c.startMonth]} · {c.platforms.join(", ")}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn small variant="ai" onClick={() => getPlan(c)} disabled={loading && sel===c.id}>✦ Monthly Plan</Btn>
              <Btn small variant="ghost" onClick={() => setCampaigns(cs=>cs.filter(x=>x.id!==c.id))}>×</Btn>
            </div>
          </div>
          {sel===c.id && aiPlan && <div style={{ marginTop: 16 }}><AiBox text={aiPlan} loading={loading && sel===c.id} /></div>}
        </Card>
      ))}
    </div>
  );
}

/* ─── Analytics ─── */
function AnalyticsTab() {
  const apiKey = useApiKey();
  const [metrics, setMetrics] = useState(() => store.get("metrics") || []);
  const [form, setForm] = useState({ platform: "Instagram", date: "", followers: "", likes: "", comments: "", shares: "", reach: "", clicks: "" });
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const fields = ["followers","likes","comments","shares","reach","clicks"];

  useEffect(() => { store.set("metrics", metrics); }, [metrics]);

  const add = () => { if (!form.date) return; setMetrics(m => [...m, { ...form, id: Date.now() }]); setForm(f => ({ ...f, followers:"",likes:"",comments:"",shares:"",reach:"",clicks:"",date:"" })); };

  const analyze = async () => {
    setLoading(true);
    const brand = store.get("brand");
    const ctx = brand ? `Brand: ${brand.name}. Goals: ${brand.goals}.` : "";
    const data = metrics.slice(-20).map(m => `${m.date}|${m.platform}|F:${m.followers} L:${m.likes} C:${m.comments} S:${m.shares} R:${m.reach} Cl:${m.clicks}`).join("\n");
    const r = await askAgent("You are a social media analytics expert. Analyze data, identify trends, give actionable recommendations.", `${ctx}\n\nData:\n${data}\n\nAnalyze trends, best content/platforms, concerns, 5 actionable recommendations.`, apiKey);
    setAiAnalysis(r); setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ color: "#E85D26", margin: 0, fontFamily: "'Playfair Display',serif" }}>Performance Analytics</h2>
      <Card>
        <Label>Log Metrics</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div><Label>Date</Label><Input value={form.date} onChange={v=>setForm(f=>({...f,date:v}))} type="date" /></div>
          <div><Label>Platform</Label><Select value={form.platform} onChange={v=>setForm(f=>({...f,platform:v}))} options={PLATFORMS} /></div>
          {fields.map(f => <div key={f}><Label>{f}</Label><Input value={form[f]} onChange={v=>setForm(fm=>({...fm,[f]:v}))} placeholder="0" /></div>)}
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 12 }}><Btn small onClick={add}>+ Log</Btn><Btn small variant="ai" onClick={analyze} disabled={loading||metrics.length===0}>✦ Analyze</Btn></div>
      </Card>
      {aiAnalysis && <Card><Label>AI Analysis</Label><AiBox text={aiAnalysis} loading={loading} /></Card>}
      {metrics.length > 2 && (
        <Card>
          <Label>Engagement (Last 10)</Label>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 140, marginTop: 12 }}>
            {metrics.slice(-10).map(m => {
              const eng = (+m.likes||0)+(+m.comments||0)+(+m.shares||0);
              const max = Math.max(...metrics.slice(-10).map(x=>(+x.likes||0)+(+x.comments||0)+(+x.shares||0)),1);
              return <div key={m.id} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4 }}><div style={{ width:"100%",background:"linear-gradient(to top,#E85D26,#F59E0B)",borderRadius:"4px 4px 0 0",height:`${(eng/max)*110}px`,minHeight:4 }} /><span style={{ color:"#64748b",fontSize:9 }}>{m.date?.slice(5)}</span></div>;
            })}
          </div>
        </Card>
      )}
      {metrics.length > 0 && (
        <Card>
          <Label>Data ({metrics.length})</Label>
          <div style={{ overflowX: "auto", marginTop: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr>{["Date","Platform",...fields].map(h=><th key={h} style={{ color:"#94a3b8",textAlign:"left",padding:"8px 10px",borderBottom:"1px solid #1e293b",fontWeight:600,textTransform:"uppercase",letterSpacing:.5 }}>{h}</th>)}</tr></thead>
              <tbody>{metrics.slice().reverse().slice(0,20).map(m=><tr key={m.id}><td style={{ color:"#E85D26",padding:"6px 10px",borderBottom:"1px solid #0f172a" }}>{m.date}</td><td style={{ color:"#cbd5e1",padding:"6px 10px",borderBottom:"1px solid #0f172a" }}>{m.platform}</td>{fields.map(f=><td key={f} style={{ color:"#cbd5e1",padding:"6px 10px",borderBottom:"1px solid #0f172a" }}>{m[f]||"—"}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ─── Review & Adapt ─── */
function ReviewTab() {
  const apiKey = useApiKey();
  const [sampleText, setSampleText] = useState("");
  const [sampleUrl, setSampleUrl] = useState("");
  const [aiReview, setAiReview] = useState("");
  const [loading, setLoading] = useState(false);

  const review = async () => {
    setLoading(true);
    const brand = store.get("brand");
    const campaigns = store.get("campaigns");
    const ctx = brand ? `Brand: ${brand.name}. ${brand.description}. Audience: ${brand.audience}. Tone: ${brand.tone}. Goals: ${brand.goals}.` : "";
    const cc = campaigns?.length ? `Active campaigns: ${campaigns.map(c=>c.name+" ("+c.goal+")").join(", ")}.` : "";
    const r = await askAgent(`You are a social media expert reviewing sample campaigns. Analyze and adapt for user's brand. ${ctx} ${cc}`, `Sample:\n${sampleUrl ? `Source: ${sampleUrl}\n` : ""}${sampleText}\n\n1. Analyze effectiveness\n2. Key techniques\n3. Adapt for our brand\n4. Write 3 adapted posts`, apiKey);
    setAiReview(r); setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h2 style={{ color: "#E85D26", margin: 0, fontFamily: "'Playfair Display',serif" }}>Review & Adapt Campaigns</h2>
      <Card>
        <Label>Paste Sample Campaign</Label>
        <TextArea value={sampleText} onChange={setSampleText} placeholder="Paste campaign text you admire..." rows={6} />
        <div style={{ marginTop: 12 }}><Label>Source URL (optional)</Label><Input value={sampleUrl} onChange={setSampleUrl} placeholder="https://..." /></div>
        <div style={{ marginTop: 14 }}><Btn variant="ai" onClick={review} disabled={loading||!sampleText.trim()}>✦ Review & Adapt</Btn></div>
      </Card>
      {(aiReview||loading) && <Card><Label>AI Review</Label><AiBox text={aiReview} loading={loading} /></Card>}
    </div>
  );
}

/* ─── Mobile Nav ─── */
function MobileNav({ tab, setTab, open, setOpen }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)" }} onClick={() => setOpen(false)}>
      <div onClick={e => e.stopPropagation()} style={{ width: 260, height: "100%", background: "#0a0f1a", borderRight: "1px solid #1e293b", padding: "20px 0", overflowY: "auto" }}>
        {TABS.map(t => (
          <div key={t.id} onClick={() => { setTab(t.id); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: tab===t.id ? "#E85D26" : "#94a3b8", background: tab===t.id ? "rgba(232,93,38,0.08)" : "transparent" }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>{t.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── App ─── */
export default function App() {
  const [tab, setTab] = useState("settings");
  const [mobileNav, setMobileNav] = useState(false);
  const Map = { brand: BrandTab, calendar: CalendarTab, create: CreateTab, images: ImageTab, campaigns: CampaignsTab, analytics: AnalyticsTab, review: ReviewTab, settings: SettingsTab };
  const Active = Map[tab];

  return (
    <div style={{ fontFamily: "'DM Sans',sans-serif", background: "#080c14", color: "#e2e8f0", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#080c14}
        ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#1e293b;border-radius:3px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        select option{background:#111827;color:#e2e8f0}
        @media(max-width:768px){.desktop-nav{display:none!important}.mobile-toggle{display:flex!important}.main-content{padding:16px!important}}
      `}</style>

      <MobileNav tab={tab} setTab={setTab} open={mobileNav} setOpen={setMobileNav} />

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#0a0f1a,#111827)", borderBottom: "1px solid #1e293b", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: "#E85D26", fontSize: 28, fontWeight: 800, fontFamily: "'Playfair Display',serif" }}>✦</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, fontFamily: "'Playfair Display',serif", letterSpacing: -0.5 }}>SocialForge</div>
            <div style={{ color: "#64748b", fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>Powered by Gemini</div>
          </div>
        </div>
        <div className="mobile-toggle" onClick={() => setMobileNav(true)} style={{ display: "none", cursor: "pointer", color: "#94a3b8", fontSize: 24, alignItems: "center", justifyContent: "center", width: 40, height: 40 }}>☰</div>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 61px)" }}>
        {/* Desktop sidebar */}
        <nav className="desktop-nav" style={{ width: 220, background: "#0a0f1a", borderRight: "1px solid #1e293b", padding: "16px 0", flexShrink: 0 }}>
          {TABS.map(t => (
            <div key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 20px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: tab===t.id ? "#E85D26" : "#64748b", background: tab===t.id ? "rgba(232,93,38,0.08)" : "transparent", borderRight: tab===t.id ? "2px solid #E85D26" : "2px solid transparent", transition: "all .15s" }}>
              <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{t.icon}</span>{t.label}
            </div>
          ))}
        </nav>
        <main className="main-content" style={{ flex: 1, padding: 28, maxWidth: 900, overflowY: "auto" }}><Active /></main>
      </div>
    </div>
  );
}
