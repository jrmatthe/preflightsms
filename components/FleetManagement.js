import { useState, useMemo } from "react";

const BLACK="#000000",NEAR_BLACK="#0A0A0A",CARD="#222222",BORDER="#2E2E2E",LIGHT_BORDER="#3A3A3A";
const WHITE="#FFFFFF",OFF_WHITE="#E0E0E0",MUTED="#777777";
const GREEN="#4ADE80",AMBER="#F59E0B",RED="#EF4444",CYAN="#22D3EE";
const card={background:CARD,borderRadius:10,border:`1px solid ${BORDER}`};
const inp={width:"100%",padding:"8px 12px",background:NEAR_BLACK,border:`1px solid ${BORDER}`,borderRadius:6,color:WHITE,fontSize:12,boxSizing:"border-box"};
const lbl={fontSize:9,color:MUTED,textTransform:"uppercase",letterSpacing:1,marginBottom:3,fontWeight:600};

const emptyForm = {
  type:"",registration:"",serial_number:"",year:"",max_passengers:"",
  base_location:"",notes:"",
};

export default function FleetManagement({ aircraft, onAdd, onUpdate, onDelete, canManage, maxAircraft }) {
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fleet = aircraft || [];

  const limit = maxAircraft || 5;
  const atLimit = fleet.length >= limit;

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
              : <button onClick={startAdd} style={{padding:"8px 20px",background:WHITE,color:BLACK,border:"none",borderRadius:6,fontWeight:700,fontSize:12,cursor:"pointer"}}>+ Add Aircraft</button>
          )}
        </div>
      </div>

      <div className="crew-grid" style={{display:"grid",gridTemplateColumns:selected||editing?"380px 1fr":"1fr",gap:16,minHeight:500}}>
        <div>
          <div style={{display:"flex",gap:6,marginBottom:10}}><input placeholder="Search aircraft..." value={search} onChange={e=>setSearch(e.target.value)} style={{...inp,flex:1}} /></div>
          {filtered.length===0?<div style={{...card,padding:24,textAlign:"center"}}><div style={{fontSize:11,color:MUTED}}>{fleet.length===0?"No aircraft registered — add your first aircraft above":"No aircraft found"}</div></div>
          :filtered.map(a=>{
            const isSelected=selected?.id===a.id;
            return (<div key={a.id} onClick={()=>selectAircraft(a)} style={{...card,padding:"12px 16px",marginBottom:6,cursor:"pointer",border:`1px solid ${isSelected?LIGHT_BORDER:BORDER}`,background:isSelected?"rgba(255,255,255,0.04)":CARD}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:WHITE}}>{a.type}</div>
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
          {editing?<AircraftForm form={form} setField={setField} onSave={save} onCancel={()=>setEditing(false)} isNew={!selected} />
          :selected?<DetailView aircraft={selected} canManage={canManage} onEdit={startEdit} onDelete={handleDelete} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} />
          :null}
        </div>}
      </div>
    </div>
  );
}

function DetailView({aircraft:a,canManage,onEdit,onDelete,confirmDelete,setConfirmDelete}) {
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

    {a.notes&&<div style={{background:NEAR_BLACK,borderRadius:10,border:`1px solid ${BORDER}`,padding:"14px 16px"}}><div style={{...lbl}}>Notes</div><div style={{fontSize:12,color:OFF_WHITE,whiteSpace:"pre-wrap"}}>{a.notes}</div></div>}
  </div>);
}

function AircraftForm({form,setField,onSave,onCancel,isNew}) {
  const field = (l,key,type="text") => (<div style={{marginBottom:8}}>
    <div style={{...lbl}}>{l}</div>
    <input type={type} value={form[key]||""} onChange={e=>{
      let v = e.target.value;
      if (key === "registration" || key === "type") v = v.toUpperCase();
      setField(key,v);
    }} style={inp} />
  </div>);

  return (<div>
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
      <textarea value={form.notes||""} onChange={e=>setField("notes",e.target.value)} rows={3} style={{...inp,resize:"vertical"}} />
    </div>
    <div style={{fontSize:9,color:MUTED,marginBottom:12}}>Registration will auto-prepend "N" if not present</div>
    <div style={{display:"flex",gap:8,marginTop:16}}>
      <button onClick={onSave} style={{padding:"10px 24px",background:GREEN,color:BLACK,border:"none",borderRadius:6,fontWeight:700,fontSize:12,cursor:"pointer"}}>{isNew?"Add Aircraft":"Save Changes"}</button>
      <button onClick={onCancel} style={{padding:"10px 24px",background:"transparent",color:MUTED,border:`1px solid ${BORDER}`,borderRadius:6,fontWeight:600,fontSize:12,cursor:"pointer"}}>Cancel</button>
    </div>
  </div>);
}
