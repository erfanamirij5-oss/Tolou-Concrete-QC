import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const root=process.cwd();
const stage=path.join(root,'.license-manager-build');
const source=path.join(root,'tools','license-manager');
const out=path.join(root,'out-license-manager');

await rm(stage,{recursive:true,force:true});
await rm(out,{recursive:true,force:true});
await mkdir(stage,{recursive:true});

for(const file of ['main.mjs','preload.cjs','index.html','styles.css','renderer.js']){
  await cp(path.join(source,file),path.join(stage,file));
}

await writeFile(path.join(stage,'package.json'),JSON.stringify({
  name:'tolou-license-manager',
  productName:'Tolou License Manager',
  version:'1.0.0',
  private:true,
  type:'module',
  main:'main.mjs',
  description:'Tolou License Manager — owner-only offline license generator',
  author:'Engineer Erfan Amiri'
},null,2));

await cp(path.join(source,'forge.config.js'),path.join(stage,'forge.config.js'));

const forge=process.platform==='win32'
  ? path.join(root,'node_modules','.bin','electron-forge.cmd')
  : path.join(root,'node_modules','.bin','electron-forge');

const args=['make','--platform=win32','--arch=x64','--out-dir',out];
const child=spawn(forge,args,{cwd:stage,stdio:'inherit',shell:false,env:process.env});
const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
if(code!==0)process.exit(typeof code==='number'?code:1);

console.log(`Tolou License Manager build completed: ${out}`);
