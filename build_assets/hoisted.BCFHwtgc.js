import{M as v,a as I,I as M,O as m}from"./mcumgr.BCrLdsK6.js";import"./hoisted.DIkDqo22.js";class p{constructor(e,t){this.validScreens=t,this.current=void 0,this.callbacks={},e&&(this.isValidScreen(e)?(this.current=e,document.getElementById(this.current).style.display="block",this.triggerCallback(this.current)):console.error(`Invalid initial screen: ${e}`))}set(e){this.isValidScreen(e)?(this.current!==void 0&&(document.getElementById(this.current).style.removeProperty("display"),this.triggerCallback(this.current,"hide")),this.current=e,document.getElementById(this.current).style.display="block",this.triggerCallback(this.current)):console.error(`Invalid screen ID: ${e}`)}get(){return this.current}on(e,t,i="show"){this.isValidScreen(e)?(this.callbacks[e]||(this.callbacks[e]={}),this.callbacks[e][i]=t):console.error(`Invalid screen ID for callbacks: ${e}`)}triggerCallback(e,t="show"){this.callbacks[e]&&this.callbacks[e][t]&&this.callbacks[e][t]()}isValidScreen(e){return this.validScreens.includes(e)&&document.getElementById(e)!==null}}const l="MONKEY",b={MONKEY:"1.0.0"},h=new p("initial-screen",["initial-screen","connected-screen","reconnect-screen"]);h.on("connected-screen",()=>{o.innerHTML=""},"hide");const E=new p(null,["bt-available-screen","bt-unavailable-screen"]),a=new p("update-waiting-screen",["update-waiting-screen","update-good-screen","update-idle-screen","update-prepare-screen","update-uploading-screen","update-complete-screen"]);navigator&&navigator.bluetooth&&navigator.bluetooth.getAvailability()?E.set("bt-available-screen"):E.set("bt-unavailable-screen");const d=document.getElementById("button-connect"),T=document.getElementById("button-disconnect"),B=document.getElementById("device-name"),w=document.getElementById("device-fw-version"),_=document.getElementById("latest-fw-version"),S=document.getElementById("update-button"),C=document.getElementById("upload-status"),o=document.getElementById("changelog"),s=new v;s.onConnecting(()=>{console.log("Connecting..."),d.disabled=!0,d.innerText="Connecting..."});s.onConnect(()=>{B.innerText=s.name,s.cmdImageState(),_.innerHTML=b[l],h.set("connected-screen")});s.onDisconnect(()=>{d.disabled=!1,d.innerText="Connect via Bluetooth",h.set("initial-screen")});s.onConnectionLoss(()=>{h.set("reconnect-screen")});s.onMessage(({op:n,group:e,id:t,data:i,length:g})=>{switch(e){case I.OS:switch(t){case m.ECHO:alert(i.r);break;case m.TASKSTAT:console.table(i.tasks);break;case m.MPSTAT:console.log(i);break}break;case I.IMAGE:switch(t){case M.STATE:i.images.forEach(c=>{if(c.active){w.innerHTML=c.version;let r=k(c.version),f=k(b[l]);u(r,f)<0?(a.set("update-idle-screen"),V(l,r,f).then(y=>{L(y)})):a.set("update-good-screen")}});break}break;default:console.log("Unknown group");break}});s.onImageUploadProgress(({percentage:n})=>{n!=0&&a.get()!="update-uploading-screen"&&a.set("update-uploading-screen"),C.innerText=`${n}%`});s.onImageUploadFinished(()=>{a.set("update-complete-screen")});d.addEventListener("click",async()=>{let e=[{namePrefix:"WAVY MONKEY",services:["03B80E5A-EDE8-4B33-A751-6CE34EC4C700".toLowerCase()]}];await s.connect(e)});T.addEventListener("click",async()=>{s.disconnect()});S.addEventListener("click",async()=>{try{a.set("update-prepare-screen"),fetch(`/firmware/${l}/app_update_${b[l]}.bin`).then(n=>n.arrayBuffer()).then(n=>{s.cmdUpload(n)})}catch{a.set("update-idle-screen")}});function k(n){return n.split(".").map(Number)}function u(n,e){for(let t=0;t<n.length;t++){if(n[t]<e[t])return-1;if(n[t]>e[t])return 1}return 0}async function V(n,e,t){let g=(await fetch(`/firmware/${n}/changelog.json`).then(c=>c.json())).versions.filter(c=>{let r=[c.major,c.minor,c.patch];return u(r,e)>0&&u(r,t)<=0});return g.sort((c,r)=>-u([c.major,c.minor,c.patch],[r.major,r.minor,r.patch])),g}function L(n){o.innerHTML="",n.forEach(e=>{o.innerHTML+=`<b>${e.major}.${e.minor}.${e.patch}</b><br/><ul>`,e.changes.forEach(t=>{o.innerHTML+=`<li>${t}</li>`}),o.innerHTML+="</ul><br/>"})}