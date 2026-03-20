import { useState, useMemo, useEffect } from "react";
import { getActiveMelItems, getMelExpirationStatus, generateMelId, calculateExpiration, getCategoryLabel, CATEGORY_LIMITS, getDaysOpen } from "../lib/melHelpers";
import { createMelAuditEntry, fetchMelAuditLog, createNotification } from "../lib/supabase";

const normalizeAircraftKey = (name) => (name || "").toLowerCase().replace(/[-\s.]/g, "");

const BLACK="#000000",NEAR_BLACK="#0A0A0A",CARD="#222222",BORDER="#2E2E2E",LIGHT_BORDER="#3A3A3A";
const WHITE="#FFFFFF",OFF_WHITE="#E0E0E0",MUTED="#777777";
const GREEN="#4ADE80",AMBER="#F59E0B",RED="#EF4444",CYAN="#22D3EE";
const card={background:CARD,borderRadius:10,border:`1px solid ${BORDER}`};
const inp={width:"100%",padding:"8px 12px",background:NEAR_BLACK,border:`1px solid ${BORDER}`,borderRadius:6,color:WHITE,fontSize:12,boxSizing:"border-box"};
const lbl={fontSize:9,color:MUTED,textTransform:"uppercase",letterSpacing:1,marginBottom:3,fontWeight:600};

const emptyForm = {
  type:"",registration:"",serial_number:"",year:"",max_passengers:"",
  base_location:"",notes:"",status_field_defs:[],dual_fuel_tanks:false,
};

const emptyMelForm = {
  description: "", mel_reference: "", category: "C", deferred_date: "", expiration_date: "", notes: "",
};

function getLocalDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function FleetManagement({ aircraft, onAdd, onUpdate, onDelete, onUpdateMel, canManage, maxAircraft, session, profile, orgId }) {
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fleet = aircraft || [];

  const limit = maxAircraft || 5;
  const atLimit = fleet.length >= limit;

  // Keep selected in sync with fleet data
  useEffect(() => {
    if (selected) {
      const updated = fleet.find(a => a.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [fleet]);

  const filtered = useMemo(() => fleet.filter(a => {
    if (search) {
      const s = search.toLowerCase();
      return (a.type||"").toLowerCase().includes(s) || (a.registration||"").toLowerCase().includes(s) || (a.serial_number||"").toLowerCase().includes(s);
    }
    return true;
  }), [fleet, search]);

  const selectAircraft = (a) => { setSelected(a); setEditing(false); setConfirmDelete(false); };
  const startAdd = () => { setSelected(null); setForm({...emptyForm}); setEditing(true); };
  const startEdit = () => { setForm({...emptyForm,...selected}); setEditing(true); };

  const save = async () => {
    if (!form.type.trim() || !form.registration.trim()) return;
    let reg = form.registration.trim().toUpperCase();
    if (reg && !reg.startsWith("N")) reg = "N" + reg;
    const toSave = {
      ...form,
      registration: reg,
      type: form.type.trim().toUpperCase(),
      year: form.year ? parseInt(form.year) || null : null,
      max_passengers: form.max_passengers ? parseInt(form.max_passengers) || null : null,
    };
    if (selected) { await onUpdate(selected.id, toSave); }
    else { await onAdd(toSave); }
    setEditing(false); setSelected(null);
  };

  const handleDelete = async () => { if (!selected) return; await onDelete(selected.id); setSelected(null); setEditing(false); setConfirmDelete(false); };
  const setField = (k, v) => setForm(p => ({...p, [k]: v}));

  return (
    <div style={{maxWidth:1200,margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div>
          <div style={{fontSize:18,fontWeight:700,color:WHITE}}>Fleet Registry</div>
          <div style={{fontSize:11,color:MUTED}}>
            <span style={{color:atLimit?AMBER:MUTED}}>{fleet.length} / {limit} aircraft</span>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {canManage && !editing && (
            atLimit
              ? <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:10,color:AMBER,fontWeight:600}}>Aircraft limit reached — upgrade to add more</span>
                  <button disabled style={{padding:"8px 20px",background:MUTED,color:BLACK,border:"none",borderRadius:6,fontWeight:700,fontSize:12,cursor:"not-allowed",opacity:0.5}}>+ Add Aircraft</button>
                </div>
              : <button data-onboarding="fleet-add-btn" onClick={startAdd} style={{padding:"8px 20px",background:WHITE,color:BLACK,border:"none",borderRadius:6,fontWeight:700,fontSize:12,cursor:"pointer"}}>+ Add Aircraft</button>
          )}
        </div>
      </div>

      <div className="crew-grid" style={{display:"grid",gridTemplateColumns:selected||editing?"380px 1fr":"1fr",gap:16,minHeight:500}}>
        <div>
          <div style={{display:"flex",gap:6,marginBottom:10}}><input placeholder="Search aircraft..." value={search} onChange={e=>setSearch(e.target.value)} style={{...inp,flex:1}} /></div>
          {filtered.length===0?<div style={{...card,padding:"40px 20px",textAlign:"center"}}>{fleet.length===0?<div>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: 14, opacity: 0.5 }}>
              <path d="M24 4L8 20l6 2-4 10 14-8 14 8-4-10 6-2L24 4z" stroke={MUTED} strokeWidth="2" strokeLinejoin="round" fill="none" />
              <line x1="24" y1="24" x2="24" y2="44" stroke={MUTED} strokeWidth="2" strokeLinecap="round" />
              <line x1="16" y1="38" x2="32" y2="38" stroke={MUTED} strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div style={{fontSize:14,fontWeight:600,color:WHITE,marginBottom:6}}>No aircraft registered</div>
            <div style={{fontSize:11,color:MUTED,lineHeight:1.6,maxWidth:340,margin:"0 auto",marginBottom:16}}>Add your fleet to enable FRAT submissions and flight following. Aircraft details are used across safety reports and risk assessments.</div>
            {canManage && !atLimit && !editing && <button data-onboarding="fleet-add-btn" onClick={startAdd} style={{padding:"10px 24px",background:WHITE,color:BLACK,border:"none",borderRadius:6,fontWeight:700,fontSize:12,cursor:"pointer"}}>Add Aircraft</button>}
          </div>:<div style={{fontSize:11,color:MUTED}}>No aircraft found</div>}</div>
          :filtered.map((a,ai)=>{
            const isSelected=selected?.id===a.id;
            const activeMel = getActiveMelItems(a.mel_items);
            const melCount = activeMel.length;
            const hasExpired = activeMel.some(m => getMelExpirationStatus(m) === "expired");
            const hasWarning = activeMel.some(m => getMelExpirationStatus(m) === "warning");
            const melColor = hasExpired ? RED : hasWarning ? AMBER : CYAN;
            return (<div key={a.id} data-onboarding={ai===0?"fleet-aircraft-card":undefined} onClick={()=>selectAircraft(a)} style={{...card,padding:"12px 16px",marginBottom:6,cursor:"pointer",border:`1px solid ${isSelected?LIGHT_BORDER:BORDER}`,background:isSelected?"rgba(255,255,255,0.04)":CARD}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:13,fontWeight:600,color:WHITE}}>{a.type}</span>
                    {melCount > 0 && (
                      <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:4,background:`${melColor}18`,color:melColor,border:`1px solid ${melColor}44`}}>
                        {melCount} MEL
                      </span>
                    )}
                  </div>
                  <div style={{fontSize:10,color:MUTED,marginTop:2}}>{a.registration} {a.serial_number&&`\u00B7 S/N ${a.serial_number}`}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  {a.base_location&&<div style={{fontSize:9,color:MUTED}}>{a.base_location}</div>}
                  {a.max_passengers&&<div style={{fontSize:9,color:MUTED,marginTop:2}}>{a.max_passengers} pax</div>}
                </div>
              </div>
            </div>);
          })}
        </div>
        {(selected||editing)&&<div style={{...card,padding:"20px 24px",overflowY:"auto",maxHeight:"calc(100vh - 200px)"}}>
          {editing?<AircraftForm form={form} setField={setField} onSave={save} onCancel={()=>setEditing(false)} isNew={!selected} aircraft={fleet} />
          :selected?<DetailView aircraft={selected} canManage={canManage} onEdit={startEdit} onDelete={handleDelete} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} onUpdateMel={onUpdateMel} session={session} profile={profile} orgId={orgId} />
          :null}
        </div>}
      </div>
    </div>
  );
}

function MelBadge({ category }) {
  const colors = { A: RED, B: AMBER, C: CYAN, D: GREEN };
  const c = colors[category] || MUTED;
  return <span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:`${c}18`,color:c,border:`1px solid ${c}44`}}>Cat {category}</span>;
}

function ExpirationBadge({ item }) {
  const status = getMelExpirationStatus(item);
  if (!item.expiration_date) return <span style={{fontSize:10,color:MUTED}}>No expiration</span>;
  const color = status === "expired" ? RED : status === "warning" ? AMBER : GREEN;
  const label = status === "expired" ? "EXPIRED" : status === "warning" ? "EXPIRING SOON" : `Exp ${item.expiration_date}`;
  return <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:3,background:`${color}18`,color,border:`1px solid ${color}44`}}>{label}</span>;
}

function MelItemRow({ item, canManage, onEdit, onRectify, rectifying, rectifyWork, setRectifyWork, rectifySaving }) {
  return (
    <div style={{padding:"10px 12px",marginBottom:6,background:NEAR_BLACK,borderRadius:8,border:`1px solid ${BORDER}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <MelBadge category={item.category} />
          {item.mel_reference && <span style={{fontSize:10,color:OFF_WHITE,fontWeight:600}}>Ref {item.mel_reference}</span>}
          <ExpirationBadge item={item} />
          {item.deferred_by_name && <span style={{fontSize:9,color:MUTED}}>by {item.deferred_by_name}</span>}
        </div>
        {canManage && item.status === "open" && !rectifying && (
          <div style={{display:"flex",gap:4}}>
            <button onClick={()=>onEdit(item)} style={{padding:"3px 8px",borderRadius:4,fontSize:10,fontWeight:600,cursor:"pointer",background:"transparent",border:`1px solid ${BORDER}`,color:CYAN}}>Edit</button>
            <button onClick={()=>onRectify(item)} style={{padding:"3px 8px",borderRadius:4,fontSize:10,fontWeight:600,cursor:"pointer",background:"transparent",border:`1px solid ${GREEN}44`,color:GREEN}}>Rectify</button>
          </div>
        )}
      </div>
      <div style={{fontSize:12,color:WHITE,marginBottom:2}}>{item.description}</div>
      {item.deferred_date && <div style={{fontSize:10,color:MUTED}}>Deferred: {item.deferred_date} ({getDaysOpen(item.deferred_date)} days open)</div>}
      {item.notes && <div style={{fontSize:10,color:MUTED,marginTop:2,fontStyle:"italic"}}>{item.notes}</div>}
      {rectifying && (
        <div style={{marginTop:8,padding:"8px 10px",background:`${GREEN}08`,border:`1px solid ${GREEN}22`,borderRadius:6}}>
          <div style={{fontSize:10,fontWeight:600,color:GREEN,marginBottom:4}}>Rectification</div>
          <textarea value={rectifyWork} onChange={e=>setRectifyWork(e.target.value)} placeholder="Work performed (required)" maxLength={10000} rows={2} style={{width:"100%",padding:"6px 8px",background:NEAR_BLACK,border:`1px solid ${BORDER}`,borderRadius:4,color:WHITE,fontSize:11,resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"}} />
          <div style={{display:"flex",gap:6,marginTop:6}}>
            <button onClick={()=>onRectify(null)} style={{padding:"4px 10px",borderRadius:4,fontSize:10,fontWeight:600,cursor:"pointer",background:"transparent",border:`1px solid ${BORDER}`,color:MUTED}}>Cancel</button>
            <button onClick={()=>onRectify(item,true)} disabled={!rectifyWork.trim()||rectifySaving} style={{padding:"4px 10px",borderRadius:4,fontSize:10,fontWeight:600,cursor:rectifyWork.trim()?"pointer":"not-allowed",background:rectifyWork.trim()?GREEN:`${GREEN}44`,border:"none",color:BLACK}}>{rectifySaving?"Saving...":"Confirm Rectification"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function MelForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({
    ...emptyMelForm,
    deferred_date: getLocalDate(),
    ...initial,
  }));

  useEffect(() => {
    if (!initial) {
      const exp = calculateExpiration(form.category, form.deferred_date);
      setForm(p => ({ ...p, expiration_date: exp || p.expiration_date }));
    }
  }, []);

  const setMelField = (k, v) => {
    setForm(p => {
      const next = { ...p, [k]: v };
      if (k === "category" || k === "deferred_date") {
        const cat = k === "category" ? v : p.category;
        const dt = k === "deferred_date" ? v : p.deferred_date;
        const exp = calculateExpiration(cat, dt);
        if (exp) next.expiration_date = exp;
        else if (cat === "A") next.expiration_date = p.expiration_date || "";
      }
      return next;
    });
  };

  const canSave = form.description.trim().length > 0;

  return (
    <div style={{background:NEAR_BLACK,borderRadius:10,border:`1px solid ${CYAN}33`,padding:"14px 16px",marginTop:8}}>
      <div style={{fontSize:12,fontWeight:700,color:WHITE,marginBottom:10}}>{initial ? "Edit MEL Item" : "Add MEL Deferral"}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div style={{gridColumn:"1 / -1"}}>
          <div style={{...lbl}}>Description *</div>
          <input value={form.description} onChange={e=>setMelField("description",e.target.value)} placeholder="e.g. Weather radar inoperative" style={inp} />
        </div>
        <div>
          <div style={{...lbl}}>MEL Reference</div>
          <input value={form.mel_reference} onChange={e=>setMelField("mel_reference",e.target.value)} placeholder="e.g. 34-1" style={inp} />
        </div>
        <div>
          <div style={{...lbl}}>Category</div>
          <select value={form.category} onChange={e=>setMelField("category",e.target.value)} style={inp}>
            {Object.keys(CATEGORY_LIMITS).map(c => <option key={c} value={c}>{c} — {CATEGORY_LIMITS[c].days ? `${CATEGORY_LIMITS[c].days} days` : "As specified"}</option>)}
          </select>
        </div>
        <div>
          <div style={{...lbl}}>Deferred Date</div>
          <input type="date" value={form.deferred_date} onChange={e=>setMelField("deferred_date",e.target.value)} style={inp} />
        </div>
        <div>
          <div style={{...lbl}}>Expiration Date{form.category !== "A" && " (auto)"}</div>
          <input type="date" value={form.expiration_date||""} onChange={e=>setMelField("expiration_date",e.target.value)} style={inp} readOnly={form.category !== "A"} />
        </div>
        <div style={{gridColumn:"1 / -1"}}>
          <div style={{...lbl}}>Notes</div>
          <input value={form.notes} onChange={e=>setMelField("notes",e.target.value)} placeholder="Optional notes" style={inp} />
        </div>
      </div>
      <div style={{display:"flex",gap:8,marginTop:12}}>
        <button onClick={()=>{ if (canSave) onSave(form); }} disabled={!canSave} style={{padding:"8px 18px",background:canSave?GREEN:`${GREEN}44`,color:BLACK,border:"none",borderRadius:6,fontWeight:700,fontSize:11,cursor:canSave?"pointer":"not-allowed"}}>{initial ? "Save Changes" : "Add MEL Item"}</button>
        <button onClick={onCancel} style={{padding:"8px 18px",background:"transparent",color:MUTED,border:`1px solid ${BORDER}`,borderRadius:6,fontWeight:600,fontSize:11,cursor:"pointer"}}>Cancel</button>
      </div>
    </div>
  );
}

function DetailView({aircraft:a,canManage,onEdit,onDelete,confirmDelete,setConfirmDelete,onUpdateMel,session,profile,orgId}) {
  const [melFormOpen, setMelFormOpen] = useState(false);
  const [editingMel, setEditingMel] = useState(null);
  const [showClosed, setShowClosed] = useState(false);
  const [rectifyingMel, setRectifyingMel] = useState(null);
  const [rectifyWork, setRectifyWork] = useState("");
  const [rectifySaving, setRectifySaving] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const melItems = a.mel_items || [];
  const activeItems = getActiveMelItems(melItems);
  const closedItems = melItems.filter(m => m.status !== "open");

  const handleSaveMel = async (formData) => {
    if (!onUpdateMel) return;
    const items = [...melItems];
    if (editingMel) {
      const idx = items.findIndex(m => m.id === editingMel.id);
      if (idx >= 0) items[idx] = { ...items[idx], ...formData };
    } else {
      items.push({
        id: generateMelId(),
        ...formData,
        status: "open",
        closed_date: null,
      });
    }
    await onUpdateMel(a.id, items);
    setMelFormOpen(false);
    setEditingMel(null);
  };

  const handleRectifyMel = async (item) => {
    if (!onUpdateMel || !rectifyWork.trim() || rectifySaving) return;
    setRectifySaving(true);
    try {
      const today = getLocalDate();
      const userId = session?.user?.id || profile?.user_id;
      const userName = profile?.full_name || "Unknown";
      const items = melItems.map(m =>
        m.id === item.id ? {
          ...m,
          status: "closed",
          closed_date: today,
          rectified_by: userId,
          rectified_by_name: userName,
          rectified_date: today,
          work_performed: rectifyWork.trim(),
        } : m
      );
      await onUpdateMel(a.id, items);
      if (orgId) {
        createMelAuditEntry(orgId, {
          aircraft_id: a.id,
          mel_item_id: item.id,
          action: "rectified",
          performed_by: userId,
          performed_by_name: userName,
          category: item.category,
          description: item.description,
          mel_reference: item.mel_reference || "",
          work_performed: rectifyWork.trim(),
        });
        createNotification(orgId, {
          type: "mel_rectified",
          title: "MEL Item Rectified",
          body: `${userName} rectified MEL on ${a.registration}: ${item.description}`,
          link_tab: "fleet",
          link_id: a.id,
          target_user_id: item.deferred_by || undefined,
          target_roles: ["admin", "safety_manager"],
        });
      }
      setRectifyingMel(null);
      setRectifyWork("");
    } finally {
      setRectifySaving(false);
    }
  };

  const loadAuditLog = async () => {
    if (!orgId) return;
    setAuditLoading(true);
    const { data } = await fetchMelAuditLog(orgId, a.id);
    setAuditLog(data);
    setAuditLoading(false);
  };

  const handleEditMel = (item) => {
    setEditingMel(item);
    setMelFormOpen(true);
  };

  return (<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
      <div>
        <div style={{fontSize:20,fontWeight:800,color:WHITE}}>{a.type}</div>
        <div style={{fontSize:11,color:MUTED}}>{a.registration} {a.serial_number&&`\u00B7 S/N ${a.serial_number}`} {a.base_location&&`\u00B7 ${a.base_location}`}</div>
      </div>
      {canManage&&<div style={{display:"flex",gap:6}}>
        <button onClick={onEdit} style={{padding:"6px 14px",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",background:"transparent",border:`1px solid ${BORDER}`,color:CYAN}}>Edit</button>
        {!confirmDelete?<button onClick={()=>setConfirmDelete(true)} style={{padding:"6px 14px",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",background:"transparent",border:`1px solid ${RED}44`,color:RED}}>Delete</button>
        :<button onClick={onDelete} style={{padding:"6px 14px",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",background:RED,border:"none",color:WHITE}}>Confirm Delete</button>}
      </div>}
    </div>

    <div style={{background:NEAR_BLACK,borderRadius:10,border:`1px solid ${BORDER}`,padding:"14px 16px",marginBottom:12}}>
      <div style={{fontSize:10,fontWeight:600,color:OFF_WHITE,marginBottom:8}}>Aircraft Details</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div><div style={{...lbl}}>Type</div><div style={{fontSize:12,color:WHITE}}>{a.type||"\u2014"}</div></div>
        <div><div style={{...lbl}}>Registration</div><div style={{fontSize:12,color:CYAN,fontWeight:600}}>{a.registration||"\u2014"}</div></div>
        <div><div style={{...lbl}}>Serial Number</div><div style={{fontSize:12,color:WHITE}}>{a.serial_number||"\u2014"}</div></div>
        <div><div style={{...lbl}}>Year</div><div style={{fontSize:12,color:WHITE}}>{a.year||"\u2014"}</div></div>
        <div><div style={{...lbl}}>Max Passengers</div><div style={{fontSize:12,color:WHITE}}>{a.max_passengers||"\u2014"}</div></div>
        <div><div style={{...lbl}}>Base Location</div><div style={{fontSize:12,color:WHITE}}>{a.base_location||"\u2014"}</div></div>
      </div>
    </div>

    {/* MEL Summary (read-only — manage from Operations > Fleet) */}
    {activeItems.length > 0 && (
      <div style={{background:NEAR_BLACK,borderRadius:10,border:`1px solid ${AMBER}44`,padding:"14px 16px",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
          <span style={{fontSize:10,fontWeight:600,color:OFF_WHITE}}>MEL Deferrals</span>
          <span style={{fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:4,background:`${AMBER}18`,color:AMBER}}>{activeItems.length} active</span>
        </div>
        {activeItems.map(item => {
          const expStatus = getMelExpirationStatus(item);
          const expColor = expStatus === "expired" ? RED : expStatus === "warning" ? AMBER : GREEN;
          return (
            <div key={item.id} style={{padding:"6px 10px",marginBottom:3,background:`${NEAR_BLACK}88`,borderRadius:6,border:`1px solid ${BORDER}`}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <MelBadge category={item.category} />
                {item.mel_reference && <span style={{fontSize:10,color:MUTED}}>Ref {item.mel_reference}</span>}
                <span style={{flex:1,fontSize:11,color:OFF_WHITE}}>{item.description}</span>
                {item.expiration_date && <span style={{fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:3,background:`${expColor}18`,color:expColor}}>{expStatus==="expired"?"EXPIRED":expStatus==="warning"?"EXPIRING":`Exp ${item.expiration_date}`}</span>}
              </div>
            </div>
          );
        })}
        <div style={{fontSize:10,color:MUTED,marginTop:6,fontStyle:"italic"}}>Manage MEL items from Operations &rarr; Fleet</div>
      </div>
    )}

    {a.notes&&<div style={{background:NEAR_BLACK,borderRadius:10,border:`1px solid ${BORDER}`,padding:"14px 16px"}}><div style={{...lbl}}>Notes</div><div style={{fontSize:12,color:OFF_WHITE,whiteSpace:"pre-wrap"}}>{a.notes}</div></div>}

    {a.status_field_defs?.length>0&&(
      <div style={{background:NEAR_BLACK,borderRadius:10,border:`1px solid ${BORDER}`,padding:"14px 16px",marginTop:12}}>
        <div style={{fontSize:10,fontWeight:600,color:OFF_WHITE,marginBottom:8}}>Custom Status Fields</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {a.status_field_defs.map(fd=>(
            <div key={fd.name}><div style={{...lbl}}>{fd.name}</div><div style={{fontSize:12,color:WHITE}}>{a.status_field_values?.[fd.name]||"\u2014"}</div></div>
          ))}
        </div>
      </div>
    )}
  </div>);
}

function AircraftForm({form,setField,onSave,onCancel,isNew,aircraft}) {
  const [suggestion, setSuggestion] = useState(null);

  const existingTypes = useMemo(() => {
    const seen = {};
    (aircraft || []).forEach(a => { if (a.type) seen[normalizeAircraftKey(a.type)] = a.type; });
    return seen;
  }, [aircraft]);

  useEffect(() => {
    const typed = form.type || "";
    if (!typed.trim()) { setSuggestion(null); return; }
    const key = normalizeAircraftKey(typed);
    const match = existingTypes[key];
    if (match && match !== typed) setSuggestion(match);
    else setSuggestion(null);
  }, [form.type, existingTypes]);

  const field = (l,key,type="text") => (<div data-onboarding={key === "type" ? "fleet-type-input" : key === "registration" ? "fleet-reg-input" : undefined} style={{marginBottom:8}}>
    <div style={{...lbl}}>{l}</div>
    <input type={type} value={form[key]||""} onChange={e=>{
      let v = e.target.value;
      if (key === "registration" || key === "type") v = v.toUpperCase();
      setField(key,v);
    }} style={inp} />
    {key === "type" && suggestion && (
      <div style={{marginTop:4,padding:"6px 10px",background:"rgba(74,222,128,0.08)",border:`1px solid ${GREEN}44`,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span style={{fontSize:11,color:OFF_WHITE}}>Did you mean <strong style={{color:WHITE}}>{suggestion}</strong>?</span>
        <button onClick={()=>setField("type",suggestion)} style={{padding:"3px 10px",background:GREEN,color:BLACK,border:"none",borderRadius:4,fontWeight:700,fontSize:10,cursor:"pointer"}}>Accept</button>
      </div>
    )}
    {key === "registration" && <div style={{fontSize:9,color:MUTED,marginTop:2}}>Will auto-prepend "N" if not present</div>}
  </div>);

  return (<div data-onboarding="fleet-form">
    <div style={{fontSize:16,fontWeight:700,color:WHITE,marginBottom:12}}>{isNew?"Add Aircraft":"Edit Aircraft"}</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {field("Aircraft Type *","type")}
      {field("Registration (Tail #) *","registration")}
      {field("Serial Number","serial_number")}
      {field("Year","year","number")}
      {field("Max Passengers","max_passengers","number")}
      {field("Base Location","base_location")}
    </div>
    <div style={{marginBottom:8,marginTop:4}}>
      <div style={{...lbl}}>Notes</div>
      <textarea value={form.notes||""} onChange={e=>setField("notes",e.target.value)} rows={3} maxLength={10000} style={{...inp,resize:"vertical"}} />
    </div>
    <div style={{marginBottom:8,marginTop:4}}>
      <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
        <input type="checkbox" checked={!!form.dual_fuel_tanks} onChange={e=>setField("dual_fuel_tanks",e.target.checked)} style={{accentColor:CYAN}} />
        <span style={{fontSize:12,color:OFF_WHITE}}>Dual fuel tanks (left/right)</span>
      </label>
      <div style={{fontSize:9,color:MUTED,marginTop:3}}>Enable for twin-engine aircraft that track fuel per tank</div>
    </div>
    <div style={{marginBottom:8,marginTop:4}}>
      <div style={{...lbl}}>Custom Status Fields (Optional)</div>
      <div style={{fontSize:9,color:MUTED,marginBottom:6}}>Parking spot and fuel remaining are included by default. Add up to 4 additional fields pilots can fill when marking arrived.</div>
      {(form.status_field_defs||[]).map((fd,i)=>(
        <div key={i} style={{display:"flex",gap:6,marginBottom:4,alignItems:"center"}}>
          <input value={fd.name} onChange={e=>{const defs=[...(form.status_field_defs||[])];defs[i]={name:e.target.value};setField("status_field_defs",defs);}} placeholder="Field name" style={{...inp,flex:1}} />
          <button onClick={()=>{const defs=[...(form.status_field_defs||[])];defs.splice(i,1);setField("status_field_defs",defs);}} style={{padding:"6px 10px",background:"transparent",border:`1px solid ${RED}44`,borderRadius:6,color:RED,fontSize:12,cursor:"pointer",fontWeight:700}}>&times;</button>
        </div>
      ))}
      {(form.status_field_defs||[]).length<4&&(
        <button onClick={()=>setField("status_field_defs",[...(form.status_field_defs||[]),{name:""}])} style={{padding:"6px 12px",background:"transparent",border:`1px solid ${BORDER}`,borderRadius:6,color:CYAN,fontSize:11,fontWeight:600,cursor:"pointer"}}>+ Add Field</button>
      )}
    </div>
    <div style={{display:"flex",gap:8,marginTop:16}}>
      <button data-onboarding="fleet-save-btn" onClick={onSave} style={{padding:"10px 24px",background:GREEN,color:BLACK,border:"none",borderRadius:6,fontWeight:700,fontSize:12,cursor:"pointer"}}>{isNew?"Add Aircraft":"Save Changes"}</button>
      <button onClick={onCancel} style={{padding:"10px 24px",background:"transparent",color:MUTED,border:`1px solid ${BORDER}`,borderRadius:6,fontWeight:600,fontSize:12,cursor:"pointer"}}>Cancel</button>
    </div>
  </div>);
}
