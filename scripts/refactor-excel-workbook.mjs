import { readFile, writeFile } from 'node:fs/promises';

const path='src/main/main.ts';
let source=await readFile(path,'utf8');
if(!source.includes("import * as XLSX from 'xlsx';")) throw new Error('XLSX import not found');
source=source.replace("import * as XLSX from 'xlsx';\n", "import * as XLSX from 'xlsx';\nimport { projectReportWorkbook } from './project-report-workbook.js';\n");
const start=source.indexOf('function projectReportWorkbook(report:ProjectQcReport)');
const end=source.indexOf('\nfunction registerIpc',start);
if(start<0||end<0) throw new Error('Inline workbook builder not found');
source=source.slice(0,start)+source.slice(end+1);
if((source.match(/function projectReportWorkbook/g)||[]).length) throw new Error('Inline builder remains');
await writeFile(path,source,'utf8');
