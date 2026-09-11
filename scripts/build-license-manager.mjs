import { cp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const root=process.cwd();
const stage=path.join(process.env.RUNNER_TEMP||os.tmpdir(),'tolou-license-manager-build');
const source=path.join(root,'tools','license-manager');
const out=path.join(root,'out-license-manager');

await rm(stage,{recursive:true,force:true});
await rm(out,{recursive:true,force:true});
await mkdir(stage,{recursive:true});

for(const file of ['main.mjs','preload.cjs','index.html','styles.css','renderer.js']){
  await cp(path.join(source,file),path.join(stage,file));
}
await cp(path.join(root,'assets','icons','Tolou-Concrete-QC.ico'),path.join(stage,'Tolou-License-Manager.ico'));

await writeFile(path.join(stage,'package.json'),JSON.stringify({
  name:'tolou-license-manager',
  productName:'Tolou License Manager',
  version:'1.0.0',
  private:true,
  type:'module',
  main:'main.mjs',
  description:'Tolou License Manager — owner-only offline license generator',
  author:'Engineer Erfan Amiri',
  devDependencies:{electron:'44.3.0'}
},null,2));

await cp(path.join(source,'forge.config.js'),path.join(stage,'forge.config.js'));
await symlink(path.join(root,'node_modules'),path.join(stage,'node_modules'),process.platform==='win32'?'junction':'dir');

const forge=process.platform==='win32'
  ? path.join(stage,'node_modules','.bin','electron-forge.cmd')
  : path.join(stage,'node_modules','.bin','electron-forge');

const child=spawn(forge,['make','--platform=win32','--arch=x64'],{cwd:stage,stdio:'inherit',shell:process.platform==='win32',env:process.env});
const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
if(code!==0)process.exit(typeof code==='number'?code:1);

await cp(path.join(stage,'out'),out,{recursive:true});
console.log(`Tolou License Manager build completed: ${out}`);
