import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { ConcreteSourceSummary, CustomerSummary, PourContextSummary, PourSummary, ProjectSummary } from '../shared/ipc';
import { PersianDateTimeInput } from './PersianDateTimeInput';
import { isoToPersianLocal } from './jalali';
import './project-workbench.css';

const nextId=(prefix:string)=>`${prefix}-${Date.now().toString(36).toUpperCase()}`;
const normalizeSearch=(value:string)=>value.normalize('NFKC').replace(/ي/g,'ی').replace(/ك/g,'ک').trim().toLocaleLowerCase('fa-IR');

export function ProjectWorkbench({onChanged,refreshKey=0}:{onChanged?:()=>void;refreshKey?:number}){
 const[projects,setProjects]=useState<ProjectSummary[]>([]),[pours,setPours]=useState<PourSummary[]>([]),[customers,setCustomers]=useState<CustomerSummary[]>([]),[sources,setSources]=useState<ConcreteSourceSummary[]>([]),[contexts,setContexts]=useState<PourContextSummary[]>([]),[selectedProject,setSelectedProject]=useState(''),[projectSearch,setProjectSearch]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[projectId,setProjectId]=useState(()=>nextId('PRJ')),[pourId,setPourId]=useState(()=>nextId('POUR'));

 const activeProjects=useMemo(()=>projects.filter(p=>p.archived===0),[projects]);
 const filteredProjects=useMemo(()=>{
  const query=normalizeSearch(projectSearch);
  if(!query)return activeProjects;
  return activeProjects.filter(project=>normalizeSearch([project.id,project.name,project.customer_name,project.address].filter(Boolean).join(' ')).includes(query));
 },[activeProjects,projectSearch]);

 async function reloadProjects(){const result=await window.tolou.listProjects();if(!result.ok)throw new Error(result.message);setProjects(result.data);const firstActive=result.data.find(x=>x.archived===0)?.id??'';setSelectedProject(current=>result.data.some(p=>p.id===current&&p.archived===0)?current:firstActive);}
 async function reloadParties(){const[c,s]=await Promise.all([window.tolou.listCustomers(),window.tolou.listConcreteSources()]);if(!c.ok)throw new Error(c.message);if(!s.ok)throw new Error(s.message);setCustomers(c.data.filter(x=>x.archived===0));setSources(s.data.filter(x=>x.archived===0));}
 useEffect(()=>{void Promise.all([reloadProjects(),reloadParties()]).catch(e=>setMessage(e instanceof Error?e.message:'بارگذاری اطلاعات انجام نشد'));},[refreshKey]);
 useEffect(()=>{if(!selectedProject){setPours([]);setContexts([]);return;}void Promise.all([window.tolou.listPours(selectedProject),window.tolou.listPourContexts(selectedProject)]).then(([p,c])=>{if(!p.ok)throw new Error(p.message);if(!c.ok)throw new Error(c.message);setPours(p.data);setContexts(c.data);}).catch(e=>setMessage(e instanceof Error?e.message:'بارگذاری بتن‌ریزی‌ها انجام نشد'));},[selectedProject,refreshKey]);

 async function resolveCustomerId(rawName:string){
  const name=rawName.trim();if(!name)return null;
  const existing=customers.find(item=>normalizeSearch(item.name)===normalizeSearch(name));if(existing)return existing.id;
  const id=nextId('CUST'),code=nextId('AUTO-CUST');const created=await window.tolou.createCustomer({id,code,name});if(!created.ok)throw new Error(created.message);
  setCustomers(current=>[...current,{id:created.data.id,code:created.data.code,name:created.data.name,archived:0}]);return created.data.id;
 }
 async function resolveConcreteSourceId(rawName:string){
  const name=rawName.trim();if(!name)return null;
  const existing=sources.find(item=>normalizeSearch(item.name)===normalizeSearch(name));if(existing)return existing.id;
  const id=nextId('SRC'),code=nextId('AUTO-SRC');
  const created=await window.tolou.createConcreteSource({id,code,name,sourceType:'unspecified'} as Parameters<typeof window.tolou.createConcreteSource>[0]);if(!created.ok)throw new Error(created.message);
  await reloadParties();return created.data.id;
 }

 async function submitProject(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget,data=new FormData(form);setBusy(true);setMessage('');try{const result=await window.tolou.createProject({id:String(data.get('id')),name:String(data.get('name')),customerName:String(data.get('customerName')),address:String(data.get('address')??'')});if(!result.ok)throw new Error(result.message);setMessage(`پروژه ${String(data.get('name'))} ثبت شد.`);form.reset();setProjectId(nextId('PRJ'));await reloadProjects();onChanged?.();}catch(e){setMessage(e instanceof Error?e.message:'ثبت پروژه انجام نشد');}finally{setBusy(false);}}
 async function submitPour(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget,data=new FormData(form);setBusy(true);setMessage('');try{const occurredAt=String(data.get('occurredAt')??'');if(!occurredAt)throw new Error('زمان بتن‌ریزی شمسی معتبر وارد کنید');const customerName=String(data.get('customerName')??'').trim(),concreteSourceName=String(data.get('concreteSourceName')??'').trim();if(!customerName&&!concreteSourceName)throw new Error('حداقل نام مشتری QC یا منبع بتن را وارد کنید');const[customerId,concreteSourceId]=await Promise.all([resolveCustomerId(customerName),resolveConcreteSourceId(concreteSourceName)]);const created=await window.tolou.createPour({id:String(data.get('id')),projectId:selectedProject,occurredAt,customerId,concreteSourceId});if(!created.ok)throw new Error(created.message);setMessage(`بتن‌ریزی ${created.data.id} با زمینه کنترل کیفیت ثبت شد.`);form.reset();setPourId(nextId('POUR'));const[p,c]=await Promise.all([window.tolou.listPours(selectedProject),window.tolou.listPourContexts(selectedProject)]);if(p.ok)setPours(p.data);if(c.ok)setContexts(c.data);onChanged?.();}catch(e){setMessage(e instanceof Error?e.message:'ثبت بتن‌ریزی انجام نشد');}finally{setBusy(false);}}

 const contextByPour=new Map(contexts.map(x=>[x.pour_id,x]));
 return <section className="project-workbench glass">
  <div className="panel-heading project-panel-heading">
   <div><p className="eyebrow">پرونده مشتری</p><h3>پروژه‌ها و بتن‌ریزی‌ها</h3></div>
   <div className="project-heading-actions">
    <div className="project-search-wrap"><input type="search" value={projectSearch} onChange={e=>setProjectSearch(e.target.value)} placeholder="جستجوی پروژه…" aria-label="جستجوی پروژه"/>{projectSearch&&<button type="button" onClick={()=>setProjectSearch('')} aria-label="پاک کردن جستجو">×</button>}</div>
    <span className="count-badge">{activeProjects.length.toLocaleString('fa-IR')}</span>
   </div>
  </div>
  {message&&<div className="workbench-message" role="status">{message}</div>}
  <div className="project-workbench-grid">
   <form className="workbench-form" onSubmit={submitProject}><h4>پروژه جدید</h4><label>شناسه<input name="id" value={projectId} onChange={e=>setProjectId(e.target.value)} required/></label><label>نام پروژه<input name="name" required/></label><label>مشتری<input name="customerName" required/></label><label>آدرس<input name="address"/></label><button className="primary-button" disabled={busy}>ثبت پروژه</button></form>
   <form className="workbench-form" onSubmit={submitPour}><h4>بتن‌ریزی جدید</h4><label>شناسه<input name="id" value={pourId} onChange={e=>setPourId(e.target.value)} required/></label><label>پروژه<select value={selectedProject} onChange={e=>setSelectedProject(e.target.value)} required><option value="">انتخاب پروژه</option>{filteredProjects.map(p=><option key={p.id} value={p.id}>{p.name} — {p.customer_name}</option>)}</select>{projectSearch&&filteredProjects.length===0&&<small className="project-search-empty">پروژه‌ای مطابق جستجو پیدا نشد.</small>}</label><label>مشتری QC<input name="customerName" placeholder="نام مشتری QC را وارد کنید" autoComplete="off"/></label><label>منبع بتن<input name="concreteSourceName" placeholder="نام منبع بتن را وارد کنید" autoComplete="off"/></label><label>زمان بتن‌ریزی (شمسی)<PersianDateTimeInput name="occurredAt" required/></label><button className="primary-button" disabled={busy||!selectedProject}>ثبت بتن‌ریزی</button><div className="pour-list">{pours.slice(0,4).map(pour=>{const ctx=contextByPour.get(pour.id);return <div key={pour.id}><span className="mono">{pour.id}</span><small>{isoToPersianLocal(pour.occurred_at)}{ctx?` · ${ctx.customer_name??'—'} · ${ctx.concrete_source_name??'—'}`:' · زمینه QC ثبت نشده'}</small></div>})}</div></form>
  </div>
 </section>;
}
