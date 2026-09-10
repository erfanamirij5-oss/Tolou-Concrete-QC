import {useEffect,useState} from 'react';
import {isoToPersianLocal,nowToPersianLocal,persianLocalToIso} from './jalali';
import './persian-datetime.css';

function initialText(defaultIso:string|null|undefined){return defaultIso===undefined?nowToPersianLocal():isoToPersianLocal(defaultIso);}

export function PersianDateTimeInput({name,defaultIso,required=false,placeholder='۱۴۰۵/۰۶/۱۹ ۱۴:۳۰'}:{name:string;defaultIso?:string|null;required?:boolean;placeholder?:string}){
  const first=initialText(defaultIso);
  const [text,setText]=useState(first);
  const [iso,setIso]=useState(()=>{try{return first?persianLocalToIso(first):'';}catch{return '';}});
  const [invalid,setInvalid]=useState(false);
  useEffect(()=>{if(defaultIso===undefined)return;const next=initialText(defaultIso);setText(next);try{setIso(next?persianLocalToIso(next):'');setInvalid(false);}catch{setIso('');setInvalid(Boolean(next));}},[defaultIso]);
  return <span className="persian-datetime-field">
    <input value={text} placeholder={placeholder} required={required} inputMode="numeric" aria-invalid={invalid||undefined} onChange={(event)=>{const value=event.target.value;setText(value);try{setIso(value.trim()?persianLocalToIso(value):'');setInvalid(false);}catch{setIso('');setInvalid(Boolean(value.trim()));}}}/>
    <input type="hidden" name={name} value={iso}/>
    {invalid&&<small className="field-error">فرمت: ۱۴۰۵/۰۶/۱۹ ۱۴:۳۰</small>}
  </span>;
}
