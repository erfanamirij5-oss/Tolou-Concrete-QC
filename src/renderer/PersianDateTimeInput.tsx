import {useEffect,useState} from 'react';
import {isoToPersianLocal,nowToPersianLocal,persianLocalToIso} from './jalali';

export function PersianDateTimeInput({name,defaultIso,required=false,placeholder='۱۴۰۵/۰۶/۱۹ ۱۴:۳۰'}:{name:string;defaultIso?:string|null;required?:boolean;placeholder?:string}){
  const [text,setText]=useState(()=>defaultIso===undefined?nowToPersianLocal():isoToPersianLocal(defaultIso));
  const [iso,setIso]=useState(()=>{try{return defaultIso===undefined?new Date().toISOString():defaultIso??'';}catch{return '';}});
  const [invalid,setInvalid]=useState(false);
  useEffect(()=>{if(defaultIso===undefined)return;setText(isoToPersianLocal(defaultIso));setIso(defaultIso??'');setInvalid(false);},[defaultIso]);
  return <span className="persian-datetime-field">
    <input value={text} placeholder={placeholder} required={required} inputMode="numeric" aria-invalid={invalid||undefined} onChange={(event)=>{const value=event.target.value;setText(value);try{setIso(value.trim()?persianLocalToIso(value):'');setInvalid(false);}catch{setIso('');setInvalid(Boolean(value.trim()));}}}/>
    <input type="hidden" name={name} value={iso}/>
    {invalid&&<small className="field-error">فرمت: ۱۴۰۵/۰۶/۱۹ ۱۴:۳۰</small>}
  </span>;
}
