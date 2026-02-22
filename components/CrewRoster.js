import { useState, useMemo } from "react";

const BLACK="#000000",NEAR_BLACK="#0A0A0A",CARD="#222222",BORDER="#2E2E2E",LIGHT_BORDER="#3A3A3A";
const WHITE="#FFFFFF",OFF_WHITE="#E0E0E0",MUTED="#777777",SUBTLE="#555555";
const GREEN="#4ADE80",YELLOW="#FACC15",AMBER="#F59E0B",RED="#EF4444",CYAN="#22D3EE";
const card={background:CARD,borderRadius:10,border:`1px solid ${BORDER}`};
const inp={width:"100%",padding:"8px 12px",background:NEAR_BLACK,border:`1px solid ${BORDER}`,borderRadius:6,color:WHITE,fontSize:12,boxSizing:"border-box"};
const lbl={fontSize:9,color:MUTED,textTransform:"uppercase",letterSpacing:1,marginBottom:3,fontWeight:600};
const POSITIONS=["PIC","SIC","Check Airman"];
const STATUSES=["active","inactive","leave","terminated"];
const CERT_TYPES=["ATP","Commercial","Private"];
const MEDICAL_CLASSES=["First","Second","Third"];
const COMMON_RATINGS=["Instrument","Multi-Engine Land","Single-Engine Land","Single-Engine Sea","Multi-Engine Sea"];

// ══════════════════════════════════════════════
// FAA AUTO-CALCULATION RULES
// ══════════════════════════════════════════════

// Calendar month end rule per FAR: "last day of the Nth month after the month of the date of examination"
function addCalendarMonths(dateStr, months) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T12:00:00"); // noon to avoid timezone shift
  d.setMonth(d.getMonth() + months + 1);
  d.setDate(0); // last day of target month
  return d.toISOString().split("T")[0];
}

// Medical privileges per 14 CFR 61.23(d) with full step-down timeline
// Age is calculated at date of examination per the regulation
//
// First Class issued:
//   Under 40: 1st class 12mo, 2nd class 12mo (same — no step-down window), 3rd class 60mo
//   40+:      1st class 6mo,  2nd class 12mo (months 7-12 = 2nd class window), 3rd class 24mo
//
// Second Class issued:
//   Under 40: 2nd class 12mo, 3rd class 60mo
//   40+:      2nd class 12mo, 3rd class 24mo
//
// Third Class issued:
//   Under 40: 3rd class 60mo
//   40+:      3rd class 24mo
//
// Part 135 requires at least 2nd class medical privileges
function calcMedicalPrivileges(medClass, issuedDate, birthDate) {
  if (!medClass || !issuedDate) return null;
  const issued = new Date(issuedDate + "T12:00:00");
  let age = 40; // conservative default if no DOB
  if (birthDate) {
    const birth = new Date(birthDate + "T12:00:00");
    age = issued.getFullYear() - birth.getFullYear();
    const m = issued.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && issued.getDate() < birth.getDate())) age--;
  }
  const under40 = age < 40;
  let first = null, second = null, third = null;
  const mc = medClass.toLowerCase();

  if (mc === "first") {
    first = addCalendarMonths(issuedDate, under40 ? 12 : 6);
    // Under 40: 1st & 2nd expire together at 12 months (no separate 2nd-class window)
    // Over 40: 1st expires at 6 months, 2nd class privileges continue through 12 months
    second = addCalendarMonths(issuedDate, 12);
    third = addCalendarMonths(issuedDate, under40 ? 60 : 24);
  } else if (mc === "second") {
    second = addCalendarMonths(issuedDate, 12);
    third = addCalendarMonths(issuedDate, under40 ? 60 : 24);
  } else if (mc === "third") {
    third = addCalendarMonths(issuedDate, under40 ? 60 : 24);
  }

  return { first, second, third, under40, age, part135Expires: second, totalExpires: third };
}

// Wrapper for alerts — returns the Part 135 relevant date (2nd class expiration)
function calcMedicalExpires(medClass, issuedDate, birthDate) {
  const p = calcMedicalPrivileges(medClass, issuedDate, birthDate);
  return p ? p.part135Expires : null;
}

// 135.297 Instrument Proficiency Check: 6 calendar months (PIC under IFR)
// Note: Part 135 PICs are EXEMPT from 61.57 per 61.57(e)(3) — this is the applicable check
function calcIPCExpires(lastDate) {
  return addCalendarMonths(lastDate, 6);
}

// 135.293 Competency Check: 12 calendar months (PIC and SIC)
// Also satisfies 61.56 flight review per 61.56(d)
function calcCheckrideExpires(lastDate) {
  return addCalendarMonths(lastDate, 12);
}

// 135.299 Line Check: 12 calendar months (PIC only)
function calcLineCheckExpires(lastDate) {
  return addCalendarMonths(lastDate, 12);
}

// 135.343 Recurrent Training: 12 calendar months
function calcRecurrentExpires(lastDate) {
  return addCalendarMonths(lastDate, 12);
}

// 135.339 FAA Observation Check: 24 calendar months (Check Airman only)
function calcFaaObservationExpires(lastDate) {
  return addCalendarMonths(lastDate, 24);
}

// Position-based requirement helpers
// PIC: 135.297, 135.293, 135.299, 135.343
// SIC: 135.293, 135.343 only (NO 135.297 IPC, NO 135.299 line check)
// Check Airman: all PIC items + 135.339 FAA observation (24 months)
function needsIPC(pos) { return pos === "PIC" || pos === "Check Airman"; }
function needsLineCheck(pos) { return pos === "PIC" || pos === "Check Airman"; }
function needsFaaObservation(pos) { return pos === "Check Airman"; }

// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════

function daysUntil(dateStr) { if (!dateStr) return null; return Math.ceil((new Date(dateStr)-new Date())/86400000); }
function fmtDate(dateStr) { if (!dateStr) return "\u2014"; return new Date(dateStr).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); }
function expColor(dateStr) { const d=daysUntil(dateStr); if(d===null) return MUTED; if(d<0) return RED; if(d<=30) return RED; if(d<=60) return AMBER; if(d<=90) return YELLOW; return GREEN; }

function expBadge(dateStr, labelText) {
  const days=daysUntil(dateStr);
  if(days===null) return null;
  const color=expColor(dateStr);
  const text=days<0?`EXPIRED ${Math.abs(days)}d ago`:days===0?"EXPIRES TODAY":days<=90?`${days}d remaining`:fmtDate(dateStr);
  return (<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${BORDER}`}}>
    <span style={{fontSize:11,color:OFF_WHITE}}>{labelText}</span>
    <span style={{fontSize:10,fontWeight:600,color,padding:"2px 8px",background:`${color}15`,border:`1px solid ${color}33`,borderRadius:4}}>{text}</span>
  </div>);
}

// Get all auto-calculated dates for a crew record
function getCalcDates(c) {
  return {
    medical_expires_calc: calcMedicalExpires(c.medical_class, c.medical_issued, c.birth_date),
    ipc_expires_calc: calcIPCExpires(c.last_ipc),
    checkride_expires_calc: calcCheckrideExpires(c.last_135_checkride),
    line_check_expires_calc: calcLineCheckExpires(c.last_line_check),
    recurrent_expires_calc: calcRecurrentExpires(c.last_recurrent),
    faa_observation_expires_calc: calcFaaObservationExpires(c.last_faa_observation),
  };
}

// Use manual override if set, otherwise auto-calc
function getExpDate(c, field, calcField) {
  return c[field] || calcField || null;
}

const emptyForm = {
  full_name:"",position:"PIC",status:"active",notes:"",birth_date:"",
  certificate_type:"",certificate_number:"",certificate_issued:"",
  ratings:[],type_ratings:[],
  medical_class:"",medical_issued:"",medical_expires:"",basicmed:false,
  last_ipc:"",ipc_expires:"",
  last_135_checkride:"",checkride_expires:"",
  last_line_check:"",line_check_expires:"",
  last_recurrent:"",recurrent_expires:"",
  last_faa_observation:"",faa_observation_expires:"",
};

// ══════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════

export default function CrewRoster({ crewRecords, onAdd, onUpdate, onDelete, canManage, fleetAircraftTypes = [] }) {
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("active");
  const [newTypeRating, setNewTypeRating] = useState("");
  const [tab, setTab] = useState("info");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const crew = crewRecords || [];

  const filtered = useMemo(() => crew.filter(c => {
    if (filterStatus && c.status !== filterStatus) return false;
    if (search) { const s=search.toLowerCase(); return (c.full_name||"").toLowerCase().includes(s); }
    return true;
  }), [crew, search, filterStatus]);

  const alertCount = useMemo(() => {
    let n=0;
    crew.filter(c=>c.status==="active").forEach(c => {
      const calc = getCalcDates(c);
      const priv = calcMedicalPrivileges(c.medical_class, c.medical_issued, c.birth_date);
      const pos = c.position;
      const dates = [
        priv?.part135Expires,
        getExpDate(c,"checkride_expires",calc.checkride_expires_calc),
        getExpDate(c,"recurrent_expires",calc.recurrent_expires_calc),
      ];
      if (needsIPC(pos)) dates.push(getExpDate(c,"ipc_expires",calc.ipc_expires_calc));
      if (needsLineCheck(pos)) dates.push(getExpDate(c,"line_check_expires",calc.line_check_expires_calc));
      if (needsFaaObservation(pos)) dates.push(getExpDate(c,"faa_observation_expires",calc.faa_observation_expires_calc));
      dates.forEach(d => { if(daysUntil(d)!==null && daysUntil(d)<=60) n++; });
    });
    return n;
  }, [crew]);

  const selectCrew=(c)=>{setSelected(c);setEditing(false);setTab("info");setConfirmDelete(false);};
  const startAdd=()=>{setSelected(null);setForm({...emptyForm});setEditing(true);setTab("info");};
  const startEdit=()=>{setForm({...emptyForm,...selected,ratings:selected.ratings||[],type_ratings:selected.type_ratings||[]});setEditing(true);};

  const save=async()=>{
    if(!form.full_name.trim()) return;
    // Auto-calculate expiration dates before saving
    const calc = getCalcDates(form);
    const toSave = {...form};
    if (!toSave.medical_expires && calc.medical_expires_calc) toSave.medical_expires = calc.medical_expires_calc;
    if (!toSave.ipc_expires && calc.ipc_expires_calc) toSave.ipc_expires = calc.ipc_expires_calc;
    if (!toSave.checkride_expires && calc.checkride_expires_calc) toSave.checkride_expires = calc.checkride_expires_calc;
    if (!toSave.line_check_expires && calc.line_check_expires_calc) toSave.line_check_expires = calc.line_check_expires_calc;
    if (!toSave.recurrent_expires && calc.recurrent_expires_calc) toSave.recurrent_expires = calc.recurrent_expires_calc;
    if (!toSave.faa_observation_expires && calc.faa_observation_expires_calc) toSave.faa_observation_expires = calc.faa_observation_expires_calc;
    // Sanitize empty strings to null (Postgres rejects "" for date columns)
    Object.keys(toSave).forEach(k => { if (toSave[k] === "") toSave[k] = null; });
    if(selected){await onUpdate(selected.id, toSave);}else{await onAdd(toSave);}
    setEditing(false);setSelected(null);
  };

  const handleDelete=async()=>{if(!selected)return;await onDelete(selected.id);setSelected(null);setEditing(false);setConfirmDelete(false);};
  const setField=(k,v)=>setForm(p=>({...p,[k]:v}));
  const toggleRating=(r)=>setForm(p=>({...p,ratings:p.ratings.includes(r)?p.ratings.filter(x=>x!==r):[...p.ratings,r]}));
  const addTypeRating=()=>{if(newTypeRating.trim()){setForm(p=>({...p,type_ratings:[...p.type_ratings,newTypeRating.trim()]}));setNewTypeRating("");}};
  const removeTypeRating=(r)=>setForm(p=>({...p,type_ratings:p.type_ratings.filter(x=>x!==r)}));

  return (
    <div style={{maxWidth:1200,margin:"0 auto"}}>
      <div data-tour="tour-crew-header" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
        <div>
          <div style={{fontSize:18,fontWeight:700,color:WHITE}}>Crew Roster</div>
          <div style={{fontSize:11,color:MUTED}}>
            {crew.filter(c=>c.status==="active").length} active crew
            {alertCount>0&&<span style={{color:AMBER,marginLeft:8}}>{"\u26A0"} {alertCount} alert{alertCount!==1?"s":""}</span>}
          </div>
        </div>
        {canManage&&!editing&&<button onClick={startAdd} style={{padding:"8px 20px",background:WHITE,color:BLACK,border:"none",borderRadius:6,fontWeight:700,fontSize:12,cursor:"pointer"}}>+ Add Crew Member</button>}
      </div>

      <div className="crew-grid" data-tour="tour-crew-list" style={{display:"grid",gridTemplateColumns:selected||editing?"380px 1fr":"1fr",gap:16,minHeight:500}}>
        <div>
          <div style={{display:"flex",gap:6,marginBottom:10}}><input placeholder="Search crew..." value={search} onChange={e=>setSearch(e.target.value)} style={{...inp,flex:1}} /></div>
          <div style={{display:"flex",gap:4,marginBottom:10}}>
            {["active","all","inactive","leave"].map(s=>(
              <button key={s} onClick={()=>setFilterStatus(s==="all"?"":s)}
                style={{padding:"4px 10px",borderRadius:4,fontSize:10,fontWeight:600,cursor:"pointer",textTransform:"uppercase",
                  background:(s==="all"?!filterStatus:filterStatus===s)?WHITE:"transparent",
                  color:(s==="all"?!filterStatus:filterStatus===s)?BLACK:MUTED,
                  border:`1px solid ${(s==="all"?!filterStatus:filterStatus===s)?WHITE:BORDER}`}}>{s}</button>
            ))}
          </div>
          {filtered.length===0?<div style={{...card,padding:24,textAlign:"center"}}><div style={{fontSize:11,color:MUTED}}>No crew members found</div></div>
          :filtered.map(c=>{
            const isSelected=selected?.id===c.id;
            const calc=getCalcDates(c);
            const pos=c.position;
            const dates=[getExpDate(c,"medical_expires",calc.medical_expires_calc),getExpDate(c,"checkride_expires",calc.checkride_expires_calc),getExpDate(c,"recurrent_expires",calc.recurrent_expires_calc)];
            if(needsIPC(pos)) dates.push(getExpDate(c,"ipc_expires",calc.ipc_expires_calc));
            if(needsLineCheck(pos)) dates.push(getExpDate(c,"line_check_expires",calc.line_check_expires_calc));
            if(needsFaaObservation(pos)) dates.push(getExpDate(c,"faa_observation_expires",calc.faa_observation_expires_calc));
            const hasAlert=dates.some(d=>{const dd=daysUntil(d);return dd!==null&&dd<=60;});
            return (<div key={c.id} onClick={()=>selectCrew(c)} style={{...card,padding:"12px 16px",marginBottom:6,cursor:"pointer",border:`1px solid ${isSelected?LIGHT_BORDER:BORDER}`,background:isSelected?"rgba(255,255,255,0.04)":CARD}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:WHITE}}>{c.full_name}{hasAlert&&<span style={{color:AMBER,marginLeft:6,fontSize:11}}>{"\u26A0"}</span>}</div>
                  <div style={{fontSize:10,color:MUTED,marginTop:2}}>{c.position}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:9,fontWeight:600,textTransform:"uppercase",color:c.status==="active"?GREEN:c.status==="leave"?YELLOW:RED}}>{c.status}</div>
                  {c.certificate_type&&<div style={{fontSize:9,color:CYAN,marginTop:2}}>{c.certificate_type}</div>}
                </div>
              </div>
              {(c.type_ratings||[]).length>0&&<div style={{display:"flex",gap:4,marginTop:6,flexWrap:"wrap"}}>{c.type_ratings.map(r=><span key={r} style={{fontSize:9,padding:"2px 6px",borderRadius:3,background:`${CYAN}15`,border:`1px solid ${CYAN}33`,color:CYAN}}>{r}</span>)}</div>}
            </div>);
          })}
        </div>
        {(selected||editing)&&<div style={{...card,padding:"20px 24px",overflowY:"auto",maxHeight:"calc(100vh - 200px)"}}>
          {editing?<CrewForm form={form} setField={setField} toggleRating={toggleRating} addTypeRating={addTypeRating} removeTypeRating={removeTypeRating} newTypeRating={newTypeRating} setNewTypeRating={setNewTypeRating} onSave={save} onCancel={()=>setEditing(false)} isNew={!selected} fleetAircraftTypes={fleetAircraftTypes} />
          :selected?<DetailView crew={selected} tab={tab} setTab={setTab} canManage={canManage} onEdit={startEdit} onDelete={handleDelete} confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete} />
          :null}
        </div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// DETAIL VIEW
// ══════════════════════════════════════════════

function DetailView({crew:c,tab,setTab,canManage,onEdit,onDelete,confirmDelete,setConfirmDelete}) {
  const calc=getCalcDates(c);
  const pos=c.position;
  const ipcExp=getExpDate(c,"ipc_expires",calc.ipc_expires_calc);
  const ckExp=getExpDate(c,"checkride_expires",calc.checkride_expires_calc);
  const lcExp=getExpDate(c,"line_check_expires",calc.line_check_expires_calc);
  const recExp=getExpDate(c,"recurrent_expires",calc.recurrent_expires_calc);
  const faoExp=getExpDate(c,"faa_observation_expires",calc.faa_observation_expires_calc);

  return (<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
      <div>
        <div style={{fontSize:20,fontWeight:800,color:WHITE}}>{c.full_name}</div>
        <div style={{fontSize:11,color:MUTED}}>{c.position}</div>
      </div>
      {canManage&&<div style={{display:"flex",gap:6}}>
        <button onClick={onEdit} style={{padding:"6px 14px",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",background:"transparent",border:`1px solid ${BORDER}`,color:CYAN}}>Edit</button>
        {!confirmDelete?<button onClick={()=>setConfirmDelete(true)} style={{padding:"6px 14px",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",background:"transparent",border:`1px solid ${RED}44`,color:RED}}>Delete</button>
        :<button onClick={onDelete} style={{padding:"6px 14px",borderRadius:6,fontSize:11,fontWeight:700,cursor:"pointer",background:RED,border:"none",color:WHITE}}>Confirm Delete</button>}
      </div>}
    </div>
    <div style={{display:"flex",gap:4,marginBottom:16}}>
      {[["info","Profile"],["currency","Currency & Checkrides"],["alerts","Expiration Alerts"]].map(([id,l])=>(
        <button key={id} onClick={()=>setTab(id)} style={{padding:"6px 14px",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",background:tab===id?WHITE:"transparent",color:tab===id?BLACK:MUTED,border:`1px solid ${tab===id?WHITE:BORDER}`}}>{l}</button>
      ))}
    </div>

    {tab==="info"&&<div>
      <div style={{...card,padding:"14px 16px",marginBottom:12,background:NEAR_BLACK}}>
        <div style={{fontSize:10,fontWeight:600,color:OFF_WHITE,marginBottom:8}}>Certificates & Ratings</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <div><div style={{...lbl}}>Certificate</div><div style={{fontSize:12,color:CYAN,fontWeight:600}}>{c.certificate_type||"\u2014"}</div></div>
          <div><div style={{...lbl}}>Number</div><div style={{fontSize:12,color:WHITE}}>{c.certificate_number||"\u2014"}</div></div>
          <div><div style={{...lbl}}>Issued</div><div style={{fontSize:12,color:WHITE}}>{fmtDate(c.certificate_issued)}</div></div>
        </div>
        {(c.ratings||[]).length>0&&<div style={{marginTop:10}}><div style={{...lbl}}>Ratings</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{c.ratings.map(r=><span key={r} style={{fontSize:10,padding:"3px 8px",borderRadius:4,background:`${GREEN}15`,border:`1px solid ${GREEN}33`,color:GREEN}}>{r}</span>)}</div></div>}
        {(c.type_ratings||[]).length>0&&<div style={{marginTop:8}}><div style={{...lbl}}>Type Ratings</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{c.type_ratings.map(r=><span key={r} style={{fontSize:10,padding:"3px 8px",borderRadius:4,background:`${CYAN}15`,border:`1px solid ${CYAN}33`,color:CYAN}}>{r}</span>)}</div></div>}
      </div>
      <div style={{...card,padding:"14px 16px",marginBottom:12,background:NEAR_BLACK}}>
        <div style={{fontSize:10,fontWeight:600,color:OFF_WHITE,marginBottom:8}}>Medical (61.23)</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
          <div><div style={{...lbl}}>Class</div><div style={{fontSize:12,color:WHITE,fontWeight:600}}>{c.medical_class||"\u2014"}{c.basicmed?" (BasicMed)":""}</div></div>
          <div><div style={{...lbl}}>Issued</div><div style={{fontSize:12,color:WHITE}}>{fmtDate(c.medical_issued)}</div></div>
        </div>
        {(()=>{
          const priv=calcMedicalPrivileges(c.medical_class,c.medical_issued,c.birth_date);
          if(!priv) return <div style={{fontSize:11,color:MUTED}}>Enter medical class and issue date to see privileges</div>;
          const now=new Date();
          const is1st=priv.first&&new Date(priv.first)>now;
          const is2nd=priv.second&&new Date(priv.second)>now;
          const is3rd=priv.third&&new Date(priv.third)>now;
          const currentPriv=is1st?"1st Class":is2nd?"2nd Class":is3rd?"3rd Class Only":"EXPIRED";
          const meets135=is1st||is2nd;
          return (<div>
            <div style={{padding:"8px 12px",borderRadius:6,marginBottom:8,background:meets135?`${GREEN}11`:`${RED}11`,border:`1px solid ${meets135?GREEN:RED}33`}}>
              <div style={{fontSize:12,fontWeight:700,color:meets135?GREEN:RED}}>Current: {currentPriv} {meets135?"\u2713 Meets Part 135":"\u26A0 Does NOT meet Part 135 minimum"}</div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:10,fontWeight:600,color:MUTED}}>PRIVILEGE STEP-DOWN TIMELINE (61.23)</span>
              <span style={{fontSize:9,color:SUBTLE}}>Age at exam: {priv.age}{priv.under40?" (under 40)":" (40+)"}</span>
            </div>
            {priv.first&&priv.second&&priv.first===priv.second?(
              <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${BORDER}`}}>
                <span style={{fontSize:11,color:OFF_WHITE}}>1st &amp; 2nd Class expire together <span style={{color:AMBER,fontSize:9}}>(Part 135 limit)</span></span>
                <span style={{fontSize:10,fontWeight:600,color:expColor(priv.first)}}>{fmtDate(priv.first)}</span>
              </div>
            ):(<>
              {priv.first&&<div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${BORDER}`}}>
                <span style={{fontSize:11,color:OFF_WHITE}}>1st Class privileges expire</span>
                <span style={{fontSize:10,fontWeight:600,color:expColor(priv.first)}}>{fmtDate(priv.first)}</span>
              </div>}
              {priv.second&&<div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${BORDER}`}}>
                <span style={{fontSize:11,color:OFF_WHITE}}>2nd Class privileges expire <span style={{color:AMBER,fontSize:9}}>(Part 135 limit)</span></span>
                <span style={{fontSize:10,fontWeight:600,color:expColor(priv.second)}}>{fmtDate(priv.second)}</span>
              </div>}
            </>)}
            {priv.third&&<div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${BORDER}`}}>
              <span style={{fontSize:11,color:OFF_WHITE}}>3rd Class privileges expire</span>
              <span style={{fontSize:10,fontWeight:600,color:expColor(priv.third)}}>{fmtDate(priv.third)}</span>
            </div>}
            {priv.first&&priv.second&&priv.first!==priv.second&&<div style={{fontSize:9,color:SUBTLE,marginTop:6}}>After 1st Class expires, 2nd Class privileges continue through {fmtDate(priv.second)}</div>}
          </div>);
        })()}
      </div>
      {c.notes&&<div style={{...card,padding:"14px 16px",background:NEAR_BLACK}}><div style={{...lbl}}>Notes</div><div style={{fontSize:12,color:OFF_WHITE,whiteSpace:"pre-wrap"}}>{c.notes}</div></div>}
    </div>}

    {tab==="currency"&&<div>
      <div style={{fontSize:9,color:MUTED,marginBottom:12}}>Part 135 currency requirements for {pos}. {needsIPC(pos)?"135.297 IPC also satisfies 135.293 competency check and 61.56 flight review.":"SIC requires 135.293 competency check and 135.343 recurrent training."}</div>

      {needsIPC(pos)&&<div style={{...card,padding:"14px 16px",marginBottom:12,background:NEAR_BLACK}}>
        <div style={{fontSize:10,fontWeight:600,color:OFF_WHITE,marginBottom:10}}>Instrument Proficiency Check (135.297) <span style={{color:MUTED,fontWeight:400}}>\u2014 6 cal months</span></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div><div style={{...lbl}}>Last IPC</div><div style={{fontSize:12,color:WHITE}}>{fmtDate(c.last_ipc)}</div></div>
          <div><div style={{...lbl}}>Expires</div><div style={{fontSize:12,color:expColor(ipcExp),fontWeight:600}}>{fmtDate(ipcExp)}</div>
            {!c.ipc_expires&&calc.ipc_expires_calc&&<div style={{fontSize:9,color:CYAN,marginTop:2}}>Auto-calculated per 135.297</div>}
          </div>
        </div>
      </div>}

      <div style={{...card,padding:"14px 16px",marginBottom:12,background:NEAR_BLACK}}>
        <div style={{fontSize:10,fontWeight:600,color:OFF_WHITE,marginBottom:10}}>Competency Check (135.293) <span style={{color:MUTED,fontWeight:400}}>\u2014 12 cal months</span></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div><div style={{...lbl}}>Last Checkride</div><div style={{fontSize:12,color:WHITE}}>{fmtDate(c.last_135_checkride)}</div></div>
          <div><div style={{...lbl}}>Expires</div><div style={{fontSize:12,color:expColor(ckExp),fontWeight:600}}>{fmtDate(ckExp)}</div>
            {!c.checkride_expires&&calc.checkride_expires_calc&&<div style={{fontSize:9,color:CYAN,marginTop:2}}>Auto-calculated per 135.293</div>}
          </div>
        </div>
        {needsIPC(pos)&&<div style={{fontSize:9,color:SUBTLE,marginTop:8}}>A current 135.297 IPC satisfies this requirement. Also satisfies 61.56 flight review.</div>}
      </div>

      {needsLineCheck(pos)&&<div style={{...card,padding:"14px 16px",marginBottom:12,background:NEAR_BLACK}}>
        <div style={{fontSize:10,fontWeight:600,color:OFF_WHITE,marginBottom:10}}>Line Check (135.299) <span style={{color:MUTED,fontWeight:400}}>\u2014 12 cal months</span></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div><div style={{...lbl}}>Last Line Check</div><div style={{fontSize:12,color:WHITE}}>{fmtDate(c.last_line_check)}</div></div>
          <div><div style={{...lbl}}>Expires</div><div style={{fontSize:12,color:expColor(lcExp),fontWeight:600}}>{fmtDate(lcExp)}</div>
            {!c.line_check_expires&&calc.line_check_expires_calc&&<div style={{fontSize:9,color:CYAN,marginTop:2}}>Auto-calculated per 135.299</div>}
          </div>
        </div>
      </div>}

      <div style={{...card,padding:"14px 16px",marginBottom:12,background:NEAR_BLACK}}>
        <div style={{fontSize:10,fontWeight:600,color:OFF_WHITE,marginBottom:10}}>Recurrent Training (135.343) <span style={{color:MUTED,fontWeight:400}}>\u2014 12 cal months</span></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div><div style={{...lbl}}>Last Recurrent</div><div style={{fontSize:12,color:WHITE}}>{fmtDate(c.last_recurrent)}</div></div>
          <div><div style={{...lbl}}>Expires</div><div style={{fontSize:12,color:expColor(recExp),fontWeight:600}}>{fmtDate(recExp)}</div>
            {!c.recurrent_expires&&calc.recurrent_expires_calc&&<div style={{fontSize:9,color:CYAN,marginTop:2}}>Auto-calculated per 135.343</div>}
          </div>
        </div>
      </div>

      {needsFaaObservation(pos)&&<div style={{...card,padding:"14px 16px",background:NEAR_BLACK}}>
        <div style={{fontSize:10,fontWeight:600,color:OFF_WHITE,marginBottom:10}}>FAA Observation Check (135.339) <span style={{color:MUTED,fontWeight:400}}>\u2014 24 cal months</span></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div><div style={{...lbl}}>Last Observation</div><div style={{fontSize:12,color:WHITE}}>{fmtDate(c.last_faa_observation)}</div></div>
          <div><div style={{...lbl}}>Expires</div><div style={{fontSize:12,color:expColor(faoExp),fontWeight:600}}>{fmtDate(faoExp)}</div>
            {!c.faa_observation_expires&&calc.faa_observation_expires_calc&&<div style={{fontSize:9,color:CYAN,marginTop:2}}>Auto-calculated per 135.339</div>}
          </div>
        </div>
      </div>}
    </div>}

    {tab==="alerts"&&<div>
      <div style={{...card,padding:"14px 16px",background:NEAR_BLACK}}>
        <div style={{fontSize:10,fontWeight:600,color:OFF_WHITE,marginBottom:8}}>Upcoming Expirations</div>
        <div style={{fontSize:9,color:MUTED,marginBottom:10}}>Dates auto-calculated per FAR unless manually overridden. Showing requirements for {pos}.</div>
        {(()=>{
          const priv=calcMedicalPrivileges(c.medical_class,c.medical_issued,c.birth_date);
          return (<>
            {priv?.first&&expBadge(priv.first,"1st Class Medical Privileges")}
            {priv?.second&&expBadge(priv.second,"2nd Class Medical (Part 135 limit)")}
            {priv?.third&&expBadge(priv.third,"3rd Class Medical (all privileges)")}
          </>);
        })()}
        {needsIPC(pos)&&expBadge(ipcExp,"IPC (135.297) \u2014 6 cal months")}
        {expBadge(ckExp,"Competency Check (135.293) \u2014 12 cal months")}
        {needsLineCheck(pos)&&expBadge(lcExp,"Line Check (135.299) \u2014 12 cal months")}
        {expBadge(recExp,"Recurrent Training (135.343) \u2014 12 cal months")}
        {needsFaaObservation(pos)&&expBadge(faoExp,"FAA Observation (135.339) \u2014 24 cal months")}
      </div>
    </div>}
  </div>);
}

// ══════════════════════════════════════════════
// FORM
// ══════════════════════════════════════════════

function CrewForm({form,setField,toggleRating,addTypeRating,removeTypeRating,newTypeRating,setNewTypeRating,onSave,onCancel,isNew,fleetAircraftTypes}) {
  const calc=getCalcDates(form);
  const section=(title)=><div style={{fontSize:10,fontWeight:600,color:OFF_WHITE,marginBottom:8,marginTop:16,paddingBottom:6,borderBottom:`1px solid ${BORDER}`}}>{title}</div>;
  const field=(l,key,type="text",opts)=>(<div style={{marginBottom:8}}>
    <div style={{...lbl}}>{l}</div>
    {type==="select"?<select value={form[key]||""} onChange={e=>setField(key,e.target.value)} style={{...inp,appearance:"auto"}}><option value="">{"\u2014"}</option>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select>
    :<input type={type} value={form[key]||""} onChange={e=>setField(key,type==="number"?parseInt(e.target.value)||0:e.target.value)} style={inp} />}
  </div>);

  const calcHint=(calcVal,farRef)=>calcVal?<div style={{fontSize:9,color:CYAN,marginTop:2}}>Will auto-calculate: {fmtDate(calcVal)} per {farRef}</div>:null;

  return (<div>
    <div style={{fontSize:16,fontWeight:700,color:WHITE,marginBottom:12}}>{isNew?"Add Crew Member":"Edit Crew Member"}</div>
    {section("Personal Information")}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {field("Full Name *","full_name")}{field("Position","position","select",POSITIONS)}
      {field("Status","status","select",STATUSES)}{field("Date of Birth","birth_date","date")}
    </div>
    {section("Certificates")}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>{field("Certificate Type","certificate_type","select",CERT_TYPES)}{field("Certificate Number","certificate_number")}{field("Date Issued","certificate_issued","date")}</div>
    <div style={{marginTop:8}}><div style={{...lbl}}>Ratings</div><div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:8}}>{COMMON_RATINGS.map(r=><button key={r} onClick={()=>toggleRating(r)} style={{padding:"4px 10px",borderRadius:4,fontSize:10,cursor:"pointer",background:form.ratings.includes(r)?`${GREEN}22`:"transparent",border:`1px solid ${form.ratings.includes(r)?GREEN+"66":BORDER}`,color:form.ratings.includes(r)?GREEN:MUTED}}>{r}</button>)}</div></div>
    <div style={{marginBottom:8}}><div style={{...lbl}}>Type Ratings (from Fleet)</div>
      {fleetAircraftTypes.length>0?<div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:6}}>{fleetAircraftTypes.map(t=><button key={t} onClick={()=>{const tr=form.type_ratings||[];setField("type_ratings",tr.includes(t)?tr.filter(x=>x!==t):[...tr,t]);}} style={{padding:"4px 10px",borderRadius:4,fontSize:10,cursor:"pointer",background:(form.type_ratings||[]).includes(t)?`${CYAN}22`:"transparent",border:`1px solid ${(form.type_ratings||[]).includes(t)?CYAN+"66":BORDER}`,color:(form.type_ratings||[]).includes(t)?CYAN:MUTED}}>{t}</button>)}</div>
      :<div style={{fontSize:10,color:MUTED,marginBottom:6}}>Add aircraft to Fleet Management to assign type ratings</div>}
      {(form.type_ratings||[]).filter(t=>!fleetAircraftTypes.includes(t)).length>0&&<div style={{marginTop:4}}><div style={{fontSize:9,color:MUTED,marginBottom:3}}>Additional (not in fleet)</div><div style={{display:"flex",gap:4,flexWrap:"wrap"}}>{form.type_ratings.filter(t=>!fleetAircraftTypes.includes(t)).map(r=><span key={r} onClick={()=>removeTypeRating(r)} style={{padding:"4px 8px",borderRadius:4,fontSize:10,cursor:"pointer",background:`${CYAN}22`,border:`1px solid ${CYAN}44`,color:CYAN}}>{r} {"\u2715"}</span>)}</div></div>}
      <div style={{display:"flex",gap:6,marginTop:6}}><input placeholder="Add custom type..." value={newTypeRating} onChange={e=>setNewTypeRating(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTypeRating()} style={{...inp,flex:1}} /><button onClick={addTypeRating} style={{padding:"6px 12px",background:CYAN,color:BLACK,border:"none",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer"}}>Add</button></div>
    </div>

    {section("Medical (auto-calculates per 61.23)")}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {field("Medical Class","medical_class","select",MEDICAL_CLASSES)}
      {field("Date Issued","medical_issued","date")}
    </div>
    {calcHint(calc.medical_expires_calc,"61.23")}
    <div style={{marginTop:6}}>{field("Expires (override)","medical_expires","date")}</div>
    <div style={{fontSize:9,color:MUTED,marginTop:2}}>Leave blank to auto-calculate. Manual entry overrides the FAR calculation.</div>
    <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:11,color:MUTED,marginTop:4}}><input type="checkbox" checked={form.basicmed} onChange={e=>setField("basicmed",e.target.checked)} />BasicMed</label>

    {needsIPC(form.position)&&<>{section("Instrument Proficiency Check (auto: 6 cal months per 135.297)")}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {field("Last IPC","last_ipc","date")}
      <div>{field("Expires (override)","ipc_expires","date")}{calcHint(calc.ipc_expires_calc,"135.297")}</div>
    </div></>}

    {section("Competency Check (auto: 12 cal months per 135.293)")}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {field("Last Checkride","last_135_checkride","date")}
      <div>{field("Expires (override)","checkride_expires","date")}{calcHint(calc.checkride_expires_calc,"135.293")}</div>
    </div>

    {needsLineCheck(form.position)&&<>{section("Line Check (auto: 12 cal months per 135.299)")}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {field("Last Line Check","last_line_check","date")}
      <div>{field("Expires (override)","line_check_expires","date")}{calcHint(calc.line_check_expires_calc,"135.299")}</div>
    </div></>}

    {section("Recurrent Training (auto: 12 cal months per 135.343)")}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {field("Last Recurrent","last_recurrent","date")}
      <div>{field("Expires (override)","recurrent_expires","date")}{calcHint(calc.recurrent_expires_calc,"135.343")}</div>
    </div>

    {needsFaaObservation(form.position)&&<>{section("FAA Observation Check (auto: 24 cal months per 135.339)")}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {field("Last FAA Observation","last_faa_observation","date")}
      <div>{field("Expires (override)","faa_observation_expires","date")}{calcHint(calc.faa_observation_expires_calc,"135.339")}</div>
    </div></>}

    {section("Notes")}
    <div style={{marginBottom:8}}><div style={{...lbl}}>Notes</div><textarea value={form.notes||""} onChange={e=>setField("notes",e.target.value)} rows={3} style={{...inp,resize:"vertical"}} /></div>
    <div style={{display:"flex",gap:8,marginTop:16}}>
      <button onClick={onSave} style={{padding:"10px 24px",background:GREEN,color:BLACK,border:"none",borderRadius:6,fontWeight:700,fontSize:12,cursor:"pointer"}}>{isNew?"Add Crew Member":"Save Changes"}</button>
      <button onClick={onCancel} style={{padding:"10px 24px",background:"transparent",color:MUTED,border:`1px solid ${BORDER}`,borderRadius:6,fontWeight:600,fontSize:12,cursor:"pointer"}}>Cancel</button>
    </div>
  </div>);
}
