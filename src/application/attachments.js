import {createHash,randomUUID} from 'node:crypto';
import {closeSync,copyFileSync,existsSync,mkdirSync,openSync,readSync,renameSync,rmSync,statSync} from 'node:fs';
import {basename,extname,isAbsolute,join,relative,resolve} from 'node:path';

const text=(value,label)=>{if(typeof value!=='string'||!value.trim())throw new Error(`${label} الزامی است`);return value.trim();};
const MAX_ATTACHMENT_BYTES=50*1024*1024;
const ALLOWED_EXTENSIONS=new Set(['.pdf','.png','.jpg','.jpeg','.webp','.csv','.txt']);
const mediaType=(extension)=>({'.pdf':'application/pdf','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.csv':'text/csv','.txt':'text/plain'}[extension.toLowerCase()]??'application/octet-stream');
const safeName=(value)=>basename(value).replace(/[^\p{L}\p{N}._-]+/gu,'_').slice(-120)||'attachment';
const inside=(root,candidate)=>{const rel=relative(root,candidate);return rel!==''&&!rel.startsWith('..')&&!isAbsolute(rel);};
const hashFile=(path)=>{const hash=createHash('sha256');const fd=openSync(path,'r');const buffer=Buffer.allocUnsafe(1024*1024);try{for(;;){const count=readSync(fd,buffer,0,buffer.length,null);if(count===0)break;hash.update(buffer.subarray(0,count));}}finally{closeSync(fd);}return hash.digest('hex');};

export function createAttachmentService(db,{companyId,actor,storageRoot,clock=()=>new Date().toISOString()}){
 companyId=text(companyId,'شرکت');actor=text(actor,'کاربر فعال');storageRoot=resolve(text(storageRoot,'مسیر نگهداری'));
 function ownedEvent(eventId){return db.prepare('SELECT id FROM external_result_events WHERE id=? AND company_id=?').get(text(eventId,'نتیجه خارجی'),companyId);}
 return{
  addFromPath(eventId,sourcePath){
   const event=ownedEvent(eventId);if(!event)throw new Error('نتیجه خارجی متعلق به این شرکت یافت نشد');
   sourcePath=resolve(text(sourcePath,'فایل پیوست'));if(!existsSync(sourcePath))throw new Error('فایل پیوست یافت نشد');
   const info=statSync(sourcePath);if(!info.isFile())throw new Error('مسیر انتخاب‌شده فایل نیست');if(info.size<=0)throw new Error('فایل پیوست خالی است');if(info.size>MAX_ATTACHMENT_BYTES)throw new Error('حجم فایل پیوست بیشتر از ۵۰ مگابایت است');
   const original=safeName(sourcePath);const extension=extname(original).toLowerCase();if(!ALLOWED_EXTENSIONS.has(extension))throw new Error('نوع فایل پیوست مجاز نیست');
   const id=randomUUID();const eventDir=resolve(storageRoot,'external-results',String(event.id));const relativePath=join('external-results',String(event.id),`${id}${extension}`);const target=resolve(storageRoot,relativePath);if(!inside(storageRoot,eventDir)||!inside(storageRoot,target))throw new Error('مسیر نگهداری پیوست معتبر نیست');mkdirSync(eventDir,{recursive:true});
   const temp=`${target}.tmp`;const sha256=hashFile(sourcePath);
   try{copyFileSync(sourcePath,temp);renameSync(temp,target);db.prepare(`INSERT INTO external_result_attachments(id,external_result_event_id,company_id,file_name,media_type,relative_path,sha256,size_bytes,added_at,added_by) VALUES(?,?,?,?,?,?,?,?,?,?)`).run(id,event.id,companyId,original,mediaType(extension),relativePath.replaceAll('\\','/'),sha256,info.size,clock(),actor);}catch(error){rmSync(temp,{force:true});rmSync(target,{force:true});throw error;}
   return{id,eventId:event.id,fileName:original,mediaType:mediaType(extension),sha256,sizeBytes:info.size};
  },
  list(eventId){if(!ownedEvent(eventId))throw new Error('نتیجه خارجی متعلق به این شرکت یافت نشد');return db.prepare(`SELECT id,external_result_event_id,file_name,media_type,sha256,size_bytes,added_at,added_by FROM external_result_attachments WHERE company_id=? AND external_result_event_id=? ORDER BY added_at DESC,id DESC`).all(companyId,eventId);}
 };
}
