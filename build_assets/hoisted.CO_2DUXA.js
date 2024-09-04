import{M,a as b,I as S,O as r}from"./mcumgr.BCrLdsK6.js";import"./hoisted.DIkDqo22.js";import"./hoisted.DpxQG_fp.js";const s={initial:document.getElementById("initial-screen"),connecting:document.getElementById("connecting-screen"),connected:document.getElementById("connected-screen")},f=document.getElementById("device-name"),L=document.getElementById("button-connect"),w=document.getElementById("button-echo"),A=document.getElementById("button-disconnect"),C=document.getElementById("button-reset"),$=document.getElementById("button-image-state"),U=document.getElementById("button-erase"),B=document.getElementById("button-test"),v=document.getElementById("button-confirm"),p=document.getElementById("image-list"),m=document.getElementById("file-info"),h=document.getElementById("file-status"),g=document.getElementById("file-image"),u=document.getElementById("file-upload"),E=document.getElementById("bluetooth-is-available"),I=document.getElementById("bluetooth-is-available-message"),_=document.getElementById("connect-block");navigator&&navigator.bluetooth&&navigator.bluetooth.getAvailability()?(I.innerText="Bluetooth is available in your browser.",E.className="alert alert-success",_.style.display="block"):(E.className="alert alert-danger",I.innerText="Bluetooth is not available in your browser.");let y=null,d=null,l=[];const e=new M;e.onConnecting(()=>{console.log("Connecting..."),s.initial.style.display="none",s.connected.style.display="none",s.connecting.style.display="block"});e.onConnect(()=>{f.innerText=e.name,s.connecting.style.display="none",s.initial.style.display="none",s.connected.style.display="block",p.innerHTML="",e.cmdImageState()});e.onDisconnect(()=>{f.innerText="Connect your device",s.connecting.style.display="none",s.connected.style.display="none",s.initial.style.display="block"});e.onMessage(({op:t,group:o,id:a,data:c,length:D})=>{switch(o){case b.OS:switch(a){case r.ECHO:alert(c.r);break;case r.TASKSTAT:console.table(c.tasks);break;case r.MPSTAT:console.log(c);break}break;case b.IMAGE:switch(a){case S.STATE:l=c.images;let n="";l.forEach(i=>{n+=`<div class="image ${i.active?"active":"standby"}">`,n+=`<h2>Slot #${i.slot} ${i.active?"active":"standby"}</h2>`,n+="<table>";const T=Array.from(i.hash).map(k=>k.toString(16).padStart(2,"0")).join("");n+=`<tr><th>Version</th><td>v${i.version}</td></tr>`,n+=`<tr><th>Bootable</th><td>${i.bootable}</td></tr>`,n+=`<tr><th>Confirmed</th><td>${i.confirmed}</td></tr>`,n+=`<tr><th>Pending</th><td>${i.pending}</td></tr>`,n+=`<tr><th>Hash</th><td>${T}</td></tr>`,n+="</table>",n+="</div>"}),p.innerHTML=n,B.disabled=!(c.images.length>1&&c.images[1].pending===!1),v.disabled=!(c.images.length>0&&c.images[0].confirmed===!1);break}break;default:console.log("Unknown group");break}});e.onImageUploadProgress(({percentage:t})=>{h.innerText=`Uploading... ${t}%`});e.onImageUploadFinished(()=>{h.innerText="Upload complete",m.innerHTML="",g.value="",e.cmdImageState()});g.addEventListener("change",()=>{y=g.files[0],d=null;const t=new FileReader;t.onload=async()=>{d=t.result;try{const o=await e.imageInfo(d);let a="<table>";a+=`<tr><th>Version</th><td>v${o.version}</td></tr>`,a+=`<tr><th>Hash</th><td>${o.hash}</td></tr>`,a+=`<tr><th>File Size</th><td>${d.byteLength} bytes</td></tr>`,a+=`<tr><th>Size</th><td>${o.imageSize} bytes</td></tr>`,a+="</table>",h.innerText="Ready to upload",m.innerHTML=a,u.disabled=!1}catch(o){m.innerHTML=`ERROR: ${o.message}`}},t.readAsArrayBuffer(y)});u.addEventListener("click",t=>{u.disabled=!0,t.stopPropagation(),y&&d&&e.cmdUpload(d)});L.addEventListener("click",async()=>{let o=[{namePrefix:"WAVY MONKEY",services:["03B80E5A-EDE8-4B33-A751-6CE34EC4C700".toLowerCase()]}];await e.connect(o)});A.addEventListener("click",async()=>{e.disconnect()});w.addEventListener("click",async()=>{const t=prompt("Enter a text message to send","Hello World!");await e.smpEcho(t)});C.addEventListener("click",async()=>{await e.cmdReset()});$.addEventListener("click",async()=>{await e.cmdImageState()});U.addEventListener("click",async()=>{await e.cmdImageErase()});B.addEventListener("click",async()=>{l.length>1&&l[1].pending===!1&&await e.cmdImageTest(l[1].hash)});v.addEventListener("click",async()=>{l.length>0&&l[0].confirmed===!1&&await e.cmdImageConfirm(l[0].hash)});
