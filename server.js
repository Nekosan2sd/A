
'use strict';
const http=require('http');
const fs=require('fs');
const path=require('path');
const os=require('os');
const WebSocket=require('ws');
const PORT=Number(process.env.PORT)||8080;
const ROOT=__dirname;
const files={'/':'tamayoke-v0.34.html','/tamayoke-v0.34.html':'tamayoke-v0.34.html','/game.js':'game.js'};
const server=http.createServer((req,res)=>{const file=files[req.url.split('?')[0]];if(!file){res.writeHead(404);return res.end('Not found')}const p=path.join(ROOT,file);res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store'});fs.createReadStream(p).pipe(res)});
const wss=new WebSocket.Server({server});
const rooms=new Map(); let nextId=1;
const code=()=>{let c;do{c=String(Math.floor(Math.random()*1e6)).padStart(6,'0')}while(rooms.has(c));return c};
const send=(ws,msg)=>ws.readyState===WebSocket.OPEN&&ws.send(JSON.stringify(msg));
const lobby=r=>{const players=[...r.clients].map(c=>({id:c.id,name:c.name,host:c===r.host}));for(const c of r.clients)send(c,{type:'lobby',players})};
const remove=ws=>{if(!ws.room)return;const r=rooms.get(ws.room);if(!r)return;r.clients.delete(ws);if(!r.clients.size){rooms.delete(ws.room);return}if(r.host===ws)r.host=[...r.clients][0];lobby(r);ws.room=null};
wss.on('connection',ws=>{ws.id=String(nextId++);ws.on('message',raw=>{let m;try{m=JSON.parse(raw)}catch{return}
 if(m.type==='create'){remove(ws);const c=code(),r={host:ws,clients:new Set([ws]),started:false};rooms.set(c,r);ws.room=c;ws.name=String(m.name||'Player').slice(0,12);send(ws,{type:'created',code:c,host:true,id:ws.id});lobby(r)}
 else if(m.type==='join'){remove(ws);const r=rooms.get(String(m.code));if(!r)return send(ws,{type:'error',message:'ルームが見つかりません'});if(r.clients.size>=4)return send(ws,{type:'error',message:'ルームは満員です'});ws.room=String(m.code);ws.name=String(m.name||'Player').slice(0,12);r.clients.add(ws);send(ws,{type:'joined',code:ws.room,host:false,id:ws.id});lobby(r)}
 else if(m.type==='start'){const r=rooms.get(ws.room);if(r&&r.host===ws){r.started=true;for(const c of r.clients)send(c,{type:'start'})}}
 else if(m.type==='state'||m.type==='event'){const r=rooms.get(ws.room);if(r)for(const c of r.clients)if(c!==ws)send(c,{...m,id:ws.id})}
 else if(m.type==='leave')remove(ws)
 });ws.on('close',()=>remove(ws))});
server.listen(PORT,'0.0.0.0',()=>{const ips=Object.values(os.networkInterfaces()).flat().filter(x=>x&&x.family==='IPv4'&&!x.internal).map(x=>x.address);console.log(`タマヨケ v0.34 LAN server: http://localhost:${PORT}`);for(const ip of ips)console.log(`同じWi-Fiから: http://${ip}:${PORT}`)});
