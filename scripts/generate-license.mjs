import { readFileSync } from 'node:fs';
import { randomUUID, sign } from 'node:crypto';

function arg(name){const index=process.argv.indexOf(`--${name}`);return index>=0?process.argv[index+1]:undefined;}
const machine=arg('machine');
const plan=Number(arg('plan'));
const privateKeyPath=arg('private-key');
const customer=arg('customer')??'';
const startAt=arg('start')?new Date(arg('start')):new Date();
if(!machine||![3,6,12,24].includes(plan)||!privateKeyPath||Number.isNaN(startAt.getTime())){
 console.error('Usage: node scripts/generate-license.mjs --machine XXXXX-XXXXX-XXXXX-XXXXX --plan 12 --private-key /path/to/Tolou-QC-License-Private-Key.pem [--customer "Company"] [--start 2026-09-11T10:00:00Z]');
 process.exit(1);
}
const expiresAt=new Date(startAt);expiresAt.setUTCMonth(expiresAt.getUTCMonth()+plan);
const payload={v:1,product:'tolou-concrete-qc',licenseId:randomUUID(),machineId:machine.toUpperCase(),planMonths:plan,issuedAt:startAt.toISOString(),expiresAt:expiresAt.toISOString(),...(customer?{customerName:customer}:{})};
const payloadBytes=Buffer.from(JSON.stringify(payload),'utf8');
const body=payloadBytes.toString('base64url');
const signature=sign(null,payloadBytes,readFileSync(privateKeyPath)).toString('base64url');
console.log(`TLQ1.${body}.${signature}`);
console.error(`\nLicense: ${payload.licenseId}\nMachine: ${payload.machineId}\nPlan: ${plan} months\nExpires: ${payload.expiresAt}`);
