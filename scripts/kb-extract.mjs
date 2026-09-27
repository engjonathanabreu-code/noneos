// Extracts text from the FGV MBA folder into chunks (kb.json). Runs locally; nothing is uploaded here.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const root = process.argv[2];
const out = [];
const seen = new Set();
const report = [];

function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(pdf|docx|pptx)$/i.test(e.name))files.push(p);}}
const files=[];walk(root);

async function pdfText(file){
  const doc = await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(file)),useSystemFonts:true,isEvalSupported:false,verbosity:0}).promise;
  const pages=[];
  for(let i=1;i<=doc.numPages;i++){const c=await (await doc.getPage(i)).getTextContent();pages.push(c.items.map(it=>it.str+(it.hasEOL?'\n':' ')).join(''));}
  return pages.join('\n\n');
}
async function docxText(file){return (await mammoth.extractRawText({path:file})).value;}
async function pptxText(file){
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const slides = Object.keys(zip.files).filter(n=>/^ppt\/slides\/slide\d+\.xml$/.test(n)).sort((a,b)=>Number(a.match(/\d+/g).pop())-Number(b.match(/\d+/g).pop()));
  const parts=[];for(const s of slides){const xml=await zip.file(s).async('string');parts.push([...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m=>m[1]).join(' '));}
  return parts.join('\n\n');
}
const clean = t => t.replace(/\u0000/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').replace(/ ?\n ?/g,'\n').trim();

// ~1400-character chunks on paragraph boundaries, with a little overlap.
function chunks(text){
  const paras=text.split(/\n{2,}|\n(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ0-9•\-–])/).map(p=>p.replace(/\n/g,' ').trim()).filter(p=>p.length>1);
  const res=[];let cur='';
  for(const p of paras){
    if(cur && (cur.length+p.length+1)>1400){res.push(cur);cur=cur.slice(-200);}
    if(p.length>1800){for(let i=0;i<p.length;i+=1400){const piece=p.slice(i,i+1400);if(cur&&cur.length+piece.length>1400){res.push(cur);cur='';}cur+=(cur?' ':'')+piece;}}
    else cur+=(cur?' ':'')+p;
  }
  if(cur.trim().length>80)res.push(cur);
  return res.filter(c=>c.replace(/[^A-Za-zÀ-ú]/g,'').length>120);
}

for(const file of files){
  const rel=path.relative(root,file);
  const discipline=rel.split(path.sep)[0];
  try{
    const ext=path.extname(file).toLowerCase();
    const raw=ext==='.pdf'?await pdfText(file):ext==='.docx'?await docxText(file):await pptxText(file);
    const text=clean(raw);
    let n=0;
    for(const c of chunks(text)){const h=crypto.createHash('sha1').update(c.toLowerCase().replace(/\s+/g,' ')).digest('hex');if(seen.has(h))continue;seen.add(h);out.push({disciplina:discipline.replace(/^Disciplina \d+ - /,''),arquivo:path.basename(file),trecho:c});n++;}
    report.push(`${n.toString().padStart(4)}  ${rel}`);
  }catch(e){report.push(`ERRO  ${rel}: ${String(e.message).slice(0,80)}`);}
}
fs.writeFileSync('kb.json',JSON.stringify(out));
fs.writeFileSync('report.txt',report.join('\n'));
console.log('files',files.length,'chunks',out.length,'chars',out.reduce((s,x)=>s+x.trecho.length,0));
