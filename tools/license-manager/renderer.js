const bridge=window.tolouLicenseManager;
const form=document.getElementById('licenseForm');
const planInput=document.getElementById('planMonths');
const startAt=document.getElementById('startAt');
const selectKey=document.getElementById('selectKey');
const keyPath=document.getElementById('keyPath');
const keyState=document.getElementById('keyState');
const resultPanel=document.getElementById('resultPanel');
const productKey=document.getElementById('productKey');
const message=document.getElementById('message');
const copyKey=document.getElementById('copyKey');
const generate=document.getElementById('generate');

function localDateTimeValue(date){const pad=n=>String(n).padStart(2,'0');return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;}
startAt.value=localDateTimeValue(new Date());

document.querySelectorAll('.plans button').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('.plans button').forEach(item=>item.classList.remove('is-active'));
  button.classList.add('is-active');planInput.value=button.dataset.plan||'12';
}));

selectKey.addEventListener('click',async()=>{
  try{const result=await bridge.selectPrivateKey();if(result.cancelled)return;keyPath.value=result.path;const name=String(result.path).split(/[\\/]/).pop();keyState.textContent=`کلید انتخاب شد: ${name}`;keyState.classList.add('is-ready');hideMessage();}
  catch(error){showMessage(error?.message||'انتخاب کلید انجام نشد.');}
});

form.addEventListener('submit',async event=>{
  event.preventDefault();hideMessage();resultPanel.classList.add('is-hidden');generate.disabled=true;generate.textContent='در حال صدور…';
  try{
    const machine=document.getElementById('machineId').value.trim();if(!machine)throw new Error('کد دستگاه را وارد کنید.');if(!keyPath.value)throw new Error('Private Key را انتخاب کنید.');
    const result=await bridge.generateLicense({
      customerName:document.getElementById('customerName').value.trim(),
      buyerName:document.getElementById('buyerName').value.trim(),
      buyerPhone:document.getElementById('buyerPhone').value.trim(),
      machineId:machine,planMonths:Number(planInput.value),keyPath:keyPath.value,startAt:startAt.value?new Date(startAt.value).toISOString():undefined
    });
    productKey.value=result.productKey;document.getElementById('licenseId').textContent=result.payload.licenseId;document.getElementById('machineSummary').textContent=result.payload.machineId;document.getElementById('planLabel').textContent=`${Number(result.payload.planMonths).toLocaleString('fa-IR')} ماه`;
    document.getElementById('expiresAt').textContent=new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'long',day:'numeric'}).format(new Date(result.payload.expiresAt));
    resultPanel.classList.remove('is-hidden');resultPanel.scrollIntoView({behavior:'smooth',block:'center'});
  }catch(error){showMessage(error?.message||'صدور Product Key انجام نشد.');}
  finally{generate.disabled=false;generate.textContent='صدور Product Key';}
});

copyKey.addEventListener('click',async()=>{
  if(!productKey.value)return;await bridge.copyText(productKey.value);const previous=copyKey.textContent;copyKey.textContent='کپی شد';setTimeout(()=>copyKey.textContent=previous,1300);
});

function showMessage(text){message.textContent=text;message.classList.remove('is-hidden');}
function hideMessage(){message.classList.add('is-hidden');message.textContent='';}
