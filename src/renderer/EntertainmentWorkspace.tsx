import { useState } from 'react';
import './entertainment-workspace.css';

type EntertainmentBridge={launchProductionGame:()=>Promise<{ok:boolean;message?:string}>};
const entertainment=()=>((window as unknown as {tolouEntertainment:EntertainmentBridge}).tolouEntertainment);

export function EntertainmentWorkspace(){
 const[busy,setBusy]=useState(false);const[message,setMessage]=useState('');
 async function launch(){setBusy(true);setMessage('');try{const result=await entertainment().launchProductionGame();if(!result.ok)throw new Error(result.message||'اجرای بازی انجام نشد.');}catch(error){setMessage(error instanceof Error?error.message:'اجرای بازی انجام نشد.');}finally{setBusy(false);}}
 return <><section className="workspace-intro entertainment-intro"><p className="eyebrow eyebrow--accent">سرگرمی</p><h2>بازی‌های طلوع</h2><p>بازی‌ها مستقل از اطلاعات مهندسی و کنترل کیفیت اجرا می‌شوند.</p></section><section className="entertainment-launcher glass panel--wide"><div className="entertainment-game-card"><div className="entertainment-game-mark">TP</div><div><p className="eyebrow eyebrow--accent">TOLOU ARCADE</p><h3>طلوع مدیریت تولید</h3><p>نسخه اصلی بازی «طلوع ـ مسئول بچینگ» بدون بازطراحی یا تغییر منطق بازی اجرا می‌شود.</p><div className="entertainment-tags"><span>نسخه اصلی</span><span>اجرای آفلاین</span><span>تمام‌صفحه</span><span>رکورد داخلی خود بازی</span></div></div></div><div className="entertainment-launch-actions"><div><strong>اجرای بازی اصلی</strong><small>بازی در یک پنجره مستقل و تمام‌صفحه باز می‌شود. برای توقف و رکورد از کنترل‌های خود بازی استفاده کنید.</small></div><button type="button" className="primary-button" disabled={busy} onClick={()=>void launch()}>{busy?'در حال اجرا…':'اجرای بازی'}</button></div>{message&&<div className="workbench-message">{message}</div>}</section></>;
}
