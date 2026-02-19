import { useState, useMemo } from "react";

const BLACK = "#000000", NEAR_BLACK = "#0A0A0A", CARD = "#222222", BORDER = "#2E2E2E";
const WHITE = "#FFFFFF", OFF_WHITE = "#E0E0E0", MUTED = "#777777";
const GREEN = "#4ADE80", YELLOW = "#FACC15", AMBER = "#F59E0B", RED = "#EF4444", CYAN = "#22D3EE";
const card = { background: CARD, borderRadius: 10, border: `1px solid ${BORDER}` };
const inp = { padding: "8px 12px", background: NEAR_BLACK, border: `1px solid ${BORDER}`, borderRadius: 6, color: WHITE, fontSize: 12, boxSizing: "border-box", width: "100%" };
const POSITIONS = ["pilot", "captain", "first_officer", "check_airman", "dispatcher", "mechanic", "other"];
const STATUSES = ["active", "inactive", "leave", "terminated"];
const CERT_TYPES = ["ATP", "Commercial", "Private", "Student", ""];
const MEDICAL_CLASSES = ["First", "Second", "Third", "BasicMed", ""];
const STATUS_COLORS = { active: GREEN, inactive: MUTED, leave: YELLOW, terminated: RED };

function daysUntil(ds) { if (!ds) return null; const d = new Date(ds), n = new Date(); d.setHours(0,0,0,0); n.setHours(0,0,0,0); return Math.ceil((d-n)/864e5); }
function expiryColor(ds) { const d = daysUntil(ds); if (d===null) return MUTED; if (d<0||d<=7) return RED; if (d<=30) return AMBER; if (d<=60) return YELLOW; return GREEN; }
function expiryLabel(ds) { const d = daysUntil(ds); if (d===null) return ""; if (d<0) return Math.abs(d)+"d overdue"; if (d===0) return "Today"; if (d<=90) return d+"d"; return ""; }
function fmtDate(d) { if (!d) return "\u2014"; return new Date(d+"T00:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); }

function getAlerts(m) {
  const a = [], checks = [
    {l:"Medical",d:m.medical_expiry},{l:"135 Checkride",d:m.next_135_checkride_due},{l:"Recurrent",d:m.recurrent_training_due},
    {l:"IPC",d:m.last_ipc,am:6},{l:"Flight Review",d:m.last_flight_review,ay:2}];
  for (const c of checks) {
    let e = c.d; if (!e) continue;
    if (c.am) { const x = new Date(c.d); x.setMonth(x.getMonth()+c.am); e = x.toISOString().split("T")[0]; }
    if (c.ay) { const x = new Date(c.d); x.setFullYear(x.getFullYear()+c.ay); e = x.toISOString().split("T")[0]; }
    const days = daysUntil(e);
    if (days !== null && days <= 60) a.push({label:c.l,date:e,days,color:expiryColor(e)});
  }
  return a.sort((a,b)=>a.days-b.days);
}

const EMPTY = {first_name:"",last_name:"",email:"",phone:"",employee_id:"",position:"pilot",status:"active",hire_date:"",base_location:"",certificate_type:"",certificate_number:"",ratings:[],type_ratings:[],medical_class:"",medical_date:"",medical_expiry:"",last_flight_review:"",last_ipc:"",last_135_checkride:"",next_135_checkride_due:"",checkride_early_grace:"",checkride_late_grace:"",last_recurrent_training:"",recurrent_training_due:"",last_day_landing:"",last_night_landing:"",day_landings_90:0,night_landings_90:0,notes:""};

function CrewForm({member,onSave,onCancel,onDelete,isNew}) {
  const [f,setF] = useState({...member}), [saving,setSaving] = useState(false);
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const go = async()=>{setSaving(true);await onSave(f);setSaving(false);};
  const Sec=({title,children})=>(<div style={{...card,padding:"16px 20px",marginBottom:12}}><div style={{fontSize:11,fontWeight:700,color:OFF_WHITE,textTransform:"uppercase",letterSpacing:1,marginBottom:12}}>{title}</div>{children}</div>);
  const R=({children})=><div style={{display:"flex",gap:10,marginBottom:8,flexWrap:"wrap"}}>{children}</div>;
  const F=({label,field,type="text",options,half})=>(<div style={{flex:half?"1 1 48%":"1 1 100%",minWidth:half?140:0}}><div style={{fontSize:9,color:MUTED,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{label}</div>{options?<select value={f[field]||""} onChange={e=>set(field,e.target.value)} style={{...inp,appearance:"auto"}}>{options.map(o=><option key={o} value={o.toLowerCase?.()??o}>{o||"\u2014"}</option>)}</select>:<input type={type} value={f[field]??""}onChange={e=>set(field,type==="number"?parseInt(e.target.value)||0:e.target.value)}style={inp}/>}</div>);
  const AF=({label,field,ph})=>(<div style={{flex:"1 1 100%"}}><div style={{fontSize:9,color:MUTED,textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{label}</div><input value={(f[field]||[]).join(", ")}onChange={e=>set(field,e.target.value.split(",").map(s=>s.trim()).filter(Boolean))}style={inp}placeholder={ph}/></div>);
  return(<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
      <div style={{fontSize:18,fontWeight:700,color:WHITE}}>{isNew?"Add Crew Member":`${f.first_name} ${f.last_name}`}</div>
      <div style={{display:"flex",gap:8}}>
        {!isNew&&onDelete&&<button onClick={()=>{if(confirm("Delete?"))onDelete(member.id)}}style={{padding:"8px 16px",background:"transparent",border:`1px solid ${RED}44`,borderRadius:6,color:RED,fontSize:11,fontWeight:600,cursor:"pointer"}}>Delete</button>}
        <button onClick={onCancel}style={{padding:"8px 16px",background:"transparent",border:`1px solid ${BORDER}`,borderRadius:6,color:MUTED,fontSize:11,fontWeight:600,cursor:"pointer"}}>Cancel</button>
        <button onClick={go}disabled={saving}style={{padding:"8px 20px",background:GREEN,border:"none",borderRadius:6,color:BLACK,fontSize:11,fontWeight:700,cursor:"pointer",opacity:saving?.6:1}}>{saving?"Saving...":"Save"}</button>
      </div>
    </div>
    <Sec title="Personal Information"><R><F label="First Name"field="first_name"half/><F label="Last Name"field="last_name"half/></R><R><F label="Email"field="email"type="email"half/><F label="Phone"field="phone"half/></R><R><F label="Employee ID"field="employee_id"half/><F label="Position"field="position"options={POSITIONS}half/></R><R><F label="Status"field="status"options={STATUSES}half/><F label="Hire Date"field="hire_date"type="date"half/></R><R><F label="Base Location"field="base_location"half/></R></Sec>
    <Sec title="Certificates & Ratings"><R><F label="Certificate Type"field="certificate_type"options={CERT_TYPES}half/><F label="Certificate Number"field="certificate_number"half/></R><R><AF label="Ratings (comma-separated)"field="ratings"ph="Instrument, Multi-Engine, SE Land..."/></R><R><AF label="Type Ratings (comma-separated)"field="type_ratings"ph="PC-12, BE-200..."/></R></Sec>
    <Sec title="Medical"><R><F label="Medical Class"field="medical_class"options={MEDICAL_CLASSES}half/><F label="Exam Date"field="medical_date"type="date"half/></R><R><F label="Medical Expiry"field="medical_expiry"type="date"half/></R></Sec>
    <Sec title="Currency & Checkrides"><R><F label="Last Flight Review (BFR)"field="last_flight_review"type="date"half/><F label="Last IPC"field="last_ipc"type="date"half/></R><R><F label="Last 135 Checkride"field="last_135_checkride"type="date"half/><F label="Next 135 Checkride Due"field="next_135_checkride_due"type="date"half/></R><R><F label="Early Grace (can take starting)"field="checkride_early_grace"type="date"half/><F label="Late Grace (expires after)"field="checkride_late_grace"type="date"half/></R><R><F label="Last Recurrent Training"field="last_recurrent_training"type="date"half/><F label="Recurrent Training Due"field="recurrent_training_due"type="date"half/></R></Sec>
    <Sec title="90-Day Currency"><R><F label="Last Day Landing"field="last_day_landing"type="date"half/><F label="Last Night Landing"field="last_night_landing"type="date"half/></R><R><F label="Day Landings (last 90d)"field="day_landings_90"type="number"half/><F label="Night Landings (last 90d)"field="night_landings_90"type="number"half/></R></Sec>
    <Sec title="Notes"><textarea value={f.notes||""}onChange={e=>set("notes",e.target.value)}rows={3}style={{...inp,resize:"vertical",fontFamily:"inherit"}}placeholder="Additional notes..."/></Sec>
  </div>);
}

function CrewRow({member,onClick}) {
  const alerts=getAlerts(member),sc=STATUS_COLORS[member.status]||MUTED,dayOk=(member.day_landings_90||0)>=3,nightOk=(member.night_landings_90||0)>=3;
  return(<div onClick={onClick}style={{...card,padding:"14px 18px",marginBottom:6,cursor:"pointer",borderColor:alerts.length>0&&alerts[0].days<0?`${RED}44`:BORDER}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:NEAR_BLACK,border:`2px solid ${sc}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:sc,flexShrink:0}}>{(member.first_name||"?")[0]}{(member.last_name||"?")[0]}</div>
        <div><div style={{fontSize:14,fontWeight:600,color:WHITE}}>{member.first_name} {member.last_name}</div>
          <div style={{display:"flex",gap:8,marginTop:2,flexWrap:"wrap"}}><span style={{fontSize:10,color:sc,fontWeight:600,textTransform:"uppercase"}}>{member.position}</span>{member.certificate_type&&<span style={{fontSize:10,color:MUTED}}>{member.certificate_type}</span>}{(member.type_ratings||[]).length>0&&<span style={{fontSize:10,color:CYAN}}>{member.type_ratings.join(", ")}</span>}</div></div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{display:"flex",gap:4}}>
          <span style={{fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:3,background:`${dayOk?GREEN:RED}18`,color:dayOk?GREEN:RED,border:`1px solid ${dayOk?GREEN:RED}33`}}>DAY {dayOk?"\u2713":"\u2717"}</span>
          <span style={{fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:3,background:`${nightOk?GREEN:RED}18`,color:nightOk?GREEN:RED,border:`1px solid ${nightOk?GREEN:RED}33`}}>NGT {nightOk?"\u2713":"\u2717"}</span>
        </div>
        {alerts.slice(0,3).map((a,i)=>(<span key={i}style={{fontSize:9,fontWeight:600,padding:"3px 8px",borderRadius:4,background:`${a.color}15`,color:a.color,border:`1px solid ${a.color}33`,whiteSpace:"nowrap"}}>{a.label}: {expiryLabel(a.date)}</span>))}
        <div style={{width:8,height:8,borderRadius:"50%",background:sc,flexShrink:0}}/>
      </div>
    </div>
  </div>);
}

function AlertsDashboard({crew}) {
  const all=[];crew.forEach(m=>{if(m.status!=="active")return;getAlerts(m).forEach(a=>all.push({...a,member:m}));});all.sort((a,b)=>a.days-b.days);
  const groups=[["Overdue",all.filter(a=>a.days<0),RED],["Critical \u2014 within 7 days",all.filter(a=>a.days>=0&&a.days<=7),RED],["Warning \u2014 within 30 days",all.filter(a=>a.days>7&&a.days<=30),AMBER],["Upcoming \u2014 within 60 days",all.filter(a=>a.days>30&&a.days<=60),YELLOW]];
  if(!all.length)return<div style={{...card,padding:"20px 24px",marginBottom:16,textAlign:"center"}}><div style={{fontSize:13,color:GREEN,fontWeight:600}}>All crew current \u2014 no upcoming expirations</div></div>;
  return(<div style={{...card,padding:"16px 20px",marginBottom:16}}>
    <div style={{fontSize:12,fontWeight:600,color:OFF_WHITE,marginBottom:12}}>Expiration Alerts</div>
    {groups.map(([t,items,c])=>items.length===0?null:(<div key={t}style={{marginBottom:12}}><div style={{fontSize:10,fontWeight:700,color:c,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>{t} ({items.length})</div>{items.map((a,i)=>(<div key={i}style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 12px",marginBottom:2,borderRadius:6,background:`${c}08`,border:`1px solid ${c}22`}}><div><span style={{fontSize:12,color:WHITE,fontWeight:600}}>{a.member.first_name} {a.member.last_name}</span><span style={{fontSize:11,color:MUTED,marginLeft:8}}>{a.label}</span></div><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:11,color:MUTED}}>{fmtDate(a.date)}</span><span style={{fontSize:10,fontWeight:700,color:c,minWidth:50,textAlign:"right"}}>{a.days<0?Math.abs(a.days)+"d overdue":a.days+"d"}</span></div></div>))}</div>))}
  </div>);
}

export default function CrewRoster({crew,onAdd,onUpdate,onDelete,canManage}) {
  const [view,setView]=useState("list"),[editing,setEditing]=useState(null),[isNew,setIsNew]=useState(false),[search,setSearch]=useState(""),[filterStatus,setFilterStatus]=useState("active");
  const filtered=useMemo(()=>{let l=crew||[];if(filterStatus!=="all")l=l.filter(m=>m.status===filterStatus);if(search){const s=search.toLowerCase();l=l.filter(m=>(m.first_name||"").toLowerCase().includes(s)||(m.last_name||"").toLowerCase().includes(s)||(m.email||"").toLowerCase().includes(s)||(m.type_ratings||[]).some(r=>r.toLowerCase().includes(s)));}return l;},[crew,search,filterStatus]);
  const handleSave=async(form)=>{if(isNew)await onAdd(form);else await onUpdate(form.id,form);setEditing(null);setIsNew(false);setView("list");};
  const handleDelete=async(id)=>{await onDelete(id);setEditing(null);setIsNew(false);setView("list");};
  const startNew=()=>{setIsNew(true);setEditing({...EMPTY});setView("detail");};
  if(view==="detail"&&editing)return<div style={{maxWidth:700,margin:"0 auto"}}><CrewForm member={editing}onSave={handleSave}onCancel={()=>{setEditing(null);setIsNew(false);setView("list");}}onDelete={canManage?handleDelete:null}isNew={isNew}/></div>;
  const active=(crew||[]).filter(m=>m.status==="active");
  return(<div style={{maxWidth:900,margin:"0 auto"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
      <div><div style={{fontSize:18,fontWeight:700,color:WHITE}}>Crew Roster</div><div style={{fontSize:11,color:MUTED}}>{active.length} active crew member{active.length!==1?"s":""}</div></div>
      {canManage&&<button onClick={startNew}style={{padding:"8px 16px",background:GREEN,color:BLACK,border:"none",borderRadius:6,fontWeight:700,fontSize:11,cursor:"pointer"}}>+ Add Crew</button>}
    </div>
    <div style={{display:"flex",gap:4,marginBottom:12}}>
      {[["list","Roster"],["alerts","Alerts"]].map(([id,label])=>(<button key={id}onClick={()=>setView(id)}style={{padding:"6px 16px",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",background:view===id?WHITE:"transparent",color:view===id?BLACK:MUTED,border:`1px solid ${view===id?WHITE:BORDER}`}}>{label}{id==="alerts"&&(()=>{const c=active.reduce((n,m)=>n+getAlerts(m).filter(a=>a.days<=30).length,0);return c>0?<span style={{marginLeft:4,fontSize:9,background:RED,color:WHITE,borderRadius:8,padding:"1px 5px"}}>{c}</span>:null;})()}</button>))}
    </div>
    {view==="alerts"&&<AlertsDashboard crew={crew||[]}/>}
    {view==="list"&&(<>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <input placeholder="Search name, email, type rating..."value={search}onChange={e=>setSearch(e.target.value)}style={{...inp,width:260}}/>
        <div style={{display:"flex",gap:4}}>{["active","all","inactive","leave","terminated"].map(s=>(<button key={s}onClick={()=>setFilterStatus(s)}style={{padding:"6px 12px",borderRadius:6,fontSize:10,fontWeight:600,cursor:"pointer",textTransform:"uppercase",background:filterStatus===s?(STATUS_COLORS[s]||WHITE)+"22":"transparent",color:filterStatus===s?(STATUS_COLORS[s]||WHITE):MUTED,border:`1px solid ${filterStatus===s?(STATUS_COLORS[s]||WHITE)+"44":BORDER}`}}>{s}</button>))}</div>
      </div>
      {filtered.length===0?(<div style={{...card,padding:40,textAlign:"center"}}><div style={{fontSize:36,marginBottom:8}}>{"\uD83D\uDC68\u200D\u2708\uFE0F"}</div><div style={{fontSize:14,color:MUTED,fontWeight:600}}>{search?"No crew members match":"No crew members yet"}</div>{canManage&&!search&&<button onClick={startNew}style={{marginTop:12,padding:"8px 20px",background:GREEN,color:BLACK,border:"none",borderRadius:6,fontWeight:700,fontSize:11,cursor:"pointer"}}>Add First Crew Member</button>}</div>):filtered.map(m=><CrewRow key={m.id}member={m}onClick={()=>{setEditing(m);setIsNew(false);setView("detail");}}/>)}
    </>)}
  </div>);
}
