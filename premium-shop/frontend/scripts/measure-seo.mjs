import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
const output = resolve('../seo/evidence');
await mkdir(output, {recursive:true});
const origin = process.env.MEASURE_ORIGIN || 'http://127.0.0.1:4200';
const products = JSON.parse(await readFile(resolve(output,'catalog.json'),'utf8'));
const paths = ['/', '/category/Software', '/product/' + products[0].id, '/robots.txt', '/sitemap.xml', '/does-not-exist', '/product/000000000000000000000000', '/login', '/admin', '/?search=test', '/?category=Software', '/category/software', '/index.html', '/category/Software/'];
const records = [];
for (const path of paths) {
  const runs = [];
  let body = '', status, headers;
  for (let run=0;run<(paths.indexOf(path)<3?3:1);run++) {
    const start=performance.now(); const response=await fetch(origin+path,{redirect:'manual',signal:AbortSignal.timeout(30000)});
    const ttfbMs=performance.now()-start; body=await response.text(); status=response.status; headers=Object.fromEntries(response.headers);
    runs.push({ttfbMs:Math.round(ttfbMs),totalMs:Math.round(performance.now()-start)});
  }
  const json=body.match(/<script id="structured-data"[^>]*>([\s\S]*?)<\/script>/)?.[1];
  if(json) JSON.parse(json);
  records.push({path,status,contentType:headers['content-type'],cacheControl:headers['cache-control'],noindex:headers['x-robots-tag']||null,location:headers.location||null,runs,bytes:Buffer.byteLength(body),h1Count:(body.match(/<h1\b/g)||[]).length,links:(body.match(/<a\b[^>]*href=/g)||[]).length,canonical:body.match(/<link rel="canonical"[^>]*>/)?.[0]||null,jsonLdValid:!!json});
  if (path === '/') await writeFile(resolve(output,'after-home.html'),body);
}
const sitemapResponse=await fetch(origin+'/sitemap.xml'); const xml=await sitemapResponse.text();
const urls=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>match[1].replace(/&amp;/g,'&'));
const links=[];
for (let index=0;index<urls.length;index+=5) {
  links.push(...await Promise.all(urls.slice(index,index+5).map(async url=>{const path=new URL(url).pathname; const response=await fetch(origin+path,{redirect:'manual'}); await response.arrayBuffer();return {path,status:response.status};})));
}
const report={measuredAt:new Date().toISOString(),origin,kind:'HTTP-only local lab probes using the live Render catalogue. Local timings are not comparable to public CDN TTFB or real-user Core Web Vitals.',pages:records,sitemapUrls:urls.length,brokenSitemapLinks:links.filter(item=>item.status!==200)};
await writeFile(resolve(output,'after-local.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
