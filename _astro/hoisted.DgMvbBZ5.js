var $=5960464477539063e-23,P=4294967296,W=9007199254740992;function K(_){var e=new ArrayBuffer(256),r=new DataView(e),n,o=0;function l(t){for(var c=e.byteLength,i=o+t;c<i;)c<<=1;if(c!==e.byteLength){var s=r;e=new ArrayBuffer(c),r=new DataView(e);for(var h=o+3>>2,a=0;a<h;++a)r.setUint32(a<<2,s.getUint32(a<<2))}return n=t,r}function d(){o+=n}function m(t){d(l(8).setFloat64(o,t))}function g(t){d(l(1).setUint8(o,t))}function I(t){for(var c=l(t.length),i=0;i<t.length;++i)c.setUint8(o+i,t[i]);d()}function u(t){d(l(2).setUint16(o,t))}function E(t){d(l(4).setUint32(o,t))}function x(t){var c=t%P,i=(t-c)/P,s=l(8);s.setUint32(o,i),s.setUint32(o+4,c),d()}function b(t,c){c<24?g(t<<5|c):c<256?(g(t<<5|24),g(c)):c<65536?(g(t<<5|25),u(c)):c<4294967296?(g(t<<5|26),E(c)):(g(t<<5|27),x(c))}function v(t){var c;if(t===!1)return g(244);if(t===!0)return g(245);if(t===null)return g(246);if(t===void 0)return g(247);switch(typeof t){case"number":if(Math.floor(t)===t){if(0<=t&&t<=W)return b(0,t);if(-W<=t&&t<0)return b(1,-(t+1))}return g(251),m(t);case"string":var i=[];for(c=0;c<t.length;++c){var s=t.charCodeAt(c);s<128?i.push(s):s<2048?(i.push(192|s>>6),i.push(128|s&63)):s<55296?(i.push(224|s>>12),i.push(128|s>>6&63),i.push(128|s&63)):(s=(s&1023)<<10,s|=t.charCodeAt(++c)&1023,s+=65536,i.push(240|s>>18),i.push(128|s>>12&63),i.push(128|s>>6&63),i.push(128|s&63))}return b(3,i.length),I(i);default:var h;if(Array.isArray(t))for(h=t.length,b(4,h),c=0;c<h;++c)v(t[c]);else if(t instanceof Uint8Array)b(2,t.length),I(t);else{var a=Object.keys(t);for(h=a.length,b(5,h),c=0;c<h;++c){var f=a[c];v(f),v(t[f])}}}}if(v(_),"slice"in e)return e.slice(0,o);for(var T=new ArrayBuffer(o),R=new DataView(T),y=0;y<o;++y)R.setUint8(y,r.getUint8(y));return T}function j(_,e,r){var n=new DataView(_),o=0;typeof e!="function"&&(e=function(i){return i}),typeof r!="function"&&(r=function(){});function l(i,s){return o+=i,s}function d(i){return l(i,new Uint8Array(_,o,i))}function m(){var i=new ArrayBuffer(4),s=new DataView(i),h=E(),a=h&32768,f=h&31744,U=h&1023;if(f===31744)f=261120;else if(f!==0)f+=114688;else if(U!==0)return(a?-1:1)*U*$;return s.setUint32(0,a<<16|f<<13|U<<13),s.getFloat32(0)}function g(){return l(4,n.getFloat32(o))}function I(){return l(8,n.getFloat64(o))}function u(){return l(1,n.getUint8(o))}function E(){return l(2,n.getUint16(o))}function x(){return l(4,n.getUint32(o))}function b(){return x()*P+x()}function v(){return n.getUint8(o)!==255?!1:(o+=1,!0)}function T(i){if(i<24)return i;if(i===24)return u();if(i===25)return E();if(i===26)return x();if(i===27)return b();if(i===31)return-1;throw"Invalid length encoding"}function R(i){var s=u();if(s===255)return-1;var h=T(s&31);if(h<0||s>>5!==i)throw"Invalid indefinite length element";return h}function y(i,s){for(var h=0;h<s;++h){var a=u();a&128&&(a<224?(a=(a&31)<<6|u()&63,s-=1):a<240?(a=(a&15)<<12|(u()&63)<<6|u()&63,s-=2):(a=(a&15)<<18|(u()&63)<<12|(u()&63)<<6|u()&63,s-=3)),a<65536?i.push(a):(a-=65536,i.push(55296|a>>10),i.push(56320|a&1023))}}function t(){var i=u(),s=i>>5,h=i&31,a,f;if(s===7)switch(h){case 25:return m();case 26:return g();case 27:return I()}if(f=T(h),f<0&&(s<2||6<s))throw"Invalid length";switch(s){case 0:return f;case 1:return-1-f;case 2:if(f<0){for(var U=[],B=0;(f=R(s))>=0;)B+=f,U.push(d(f));var V=new Uint8Array(B),F=0;for(a=0;a<U.length;++a)V.set(U[a],F),F+=U[a].length;return V}return d(f);case 3:var O=[];if(f<0)for(;(f=R(s))>=0;)y(O,f);else y(O,f);return String.fromCharCode.apply(null,O);case 4:var M;if(f<0)for(M=[];!v();)M.push(t());else for(M=new Array(f),a=0;a<f;++a)M[a]=t();return M;case 5:var G={};for(a=0;a<f||f<0&&!v();++a){var z=t();G[z]=t()}return G;case 6:return e(t(),f);case 7:switch(f){case 20:return!1;case 21:return!0;case 22:return null;case 23:return;default:return r(f)}}}var c=t();if(o!==_.byteLength)throw"Remaining bytes";return c}const L={encode:K,decode:j},A={READ:0,READ_RSP:1,WRITE:2,WRITE_RSP:3},w={OS:0,IMAGE:1,STAT:2,CONFIG:3,LOG:4,CRASH:5,SPLIT:6,RUN:7,FS:8,SHELL:9},C={ECHO:0,CONS_ECHO_CTRL:1,TASKSTAT:2,MPSTAT:3,DATETIME_STR:4,RESET:5},S={STATE:0,UPLOAD:1,FILE:2,CORELIST:3,CORELOAD:4,ERASE:5};class Y{constructor(e={}){this.SMP_SERVICE_UUID="8d53dc1d-1db7-4cd3-868b-8a527460aa84",this.SMP_CHARACTERISTIC_UUID="da2e7828-fbce-4e01-ae9e-261174997c48",this._mtu=140,this._device=null,this._service=null,this._characteristic=null,this._connectCallback=null,this._connectingCallback=null,this._disconnectCallback=null,this._messageCallback=null,this._imageUploadProgressCallback=null,this._uploadIsInProgress=!1,this._buffer=new Uint8Array,this._logger=e.logger||{info:console.log,error:console.error},this._seq=0,this._userRequestedDisconnect=!1}async _requestDevice(e){const r={acceptAllDevices:!1,optionalServices:[this.SMP_SERVICE_UUID]};return e&&(r.filters=e,r.acceptAllDevices=!1),navigator.bluetooth.requestDevice(r)}async connect(e){try{this._device=await this._requestDevice(e),this._logger.info(`Connecting to device ${this.name}...`),this._device.addEventListener("gattserverdisconnected",async r=>{this._logger.info(r),this._userRequestedDisconnect?this._disconnected():(this._logger.info("Trying to reconnect"),await new Promise(n=>setTimeout(n,1e3)),await this._connect())}),await this._connect()}catch(r){this._logger.error(r),await this._disconnected();return}}async _connect(){try{this._connectingCallback&&this._connectingCallback();const e=await this._device.gatt.connect();this._logger.info("Server connected."),this._service=await e.getPrimaryService(this.SMP_SERVICE_UUID),this._logger.info("Service connected."),this._characteristic=await this._service.getCharacteristic(this.SMP_CHARACTERISTIC_UUID),this._characteristic.addEventListener("characteristicvaluechanged",this._notification.bind(this)),await this._characteristic.startNotifications(),await this._connected(),this._uploadIsInProgress&&this._uploadNext()}catch(e){this._logger.error(e),await this._disconnected()}}disconnect(){return this._userRequestedDisconnect=!0,this._device.gatt.disconnect()}onConnecting(e){return this._connectingCallback=e,this}onConnect(e){return this._connectCallback=e,this}onDisconnect(e){return this._disconnectCallback=e,this}onMessage(e){return this._messageCallback=e,this}onImageUploadProgress(e){return this._imageUploadProgressCallback=e,this}onImageUploadFinished(e){return this._imageUploadFinishedCallback=e,this}async _connected(){this._connectCallback&&this._connectCallback()}async _disconnected(){this._logger.info("Disconnected."),this._disconnectCallback&&this._disconnectCallback(),this._device=null,this._service=null,this._characteristic=null,this._uploadIsInProgress=!1,this._userRequestedDisconnect=!1}get name(){return this._device&&this._device.name}async _sendMessage(e,r,n,o){let d=[];typeof o<"u"&&(d=[...new Uint8Array(L.encode(o))]);const m=d.length&255,g=d.length>>8,I=r&255,u=r>>8,E=[e,0,g,m,u,I,this._seq,n,...d];await this._characteristic.writeValueWithoutResponse(Uint8Array.from(E)),this._seq=(this._seq+1)%256}_notification(e){const r=new Uint8Array(e.target.value.buffer);this._buffer=new Uint8Array([...this._buffer,...r]);const n=this._buffer[2]*256+this._buffer[3];this._buffer.length<n+8||(this._processMessage(this._buffer.slice(0,n+8)),this._buffer=this._buffer.slice(n+8))}_processMessage(e){const[r,n,o,l,d,m,g,I]=e,u=L.decode(e.slice(8).buffer),E=o*256+l,x=d*256+m;if(x===w.IMAGE&&I===S.UPLOAD&&(u.rc===0||u.rc===void 0)&&u.off){this._uploadOffset=u.off,this._uploadNext();return}this._messageCallback&&this._messageCallback({op:r,group:x,id:I,data:u,length:E})}cmdReset(){return this._sendMessage(A.WRITE,w.OS,C.RESET)}smpEcho(e){return this._sendMessage(A.WRITE,w.OS,C.ECHO,{d:e})}cmdImageState(){return this._sendMessage(A.READ,w.IMAGE,S.STATE)}cmdImageErase(){return this._sendMessage(A.WRITE,w.IMAGE,S.ERASE,{})}cmdImageTest(e){return this._sendMessage(A.WRITE,w.IMAGE,S.STATE,{hash:e,confirm:!1})}cmdImageConfirm(e){return this._sendMessage(A.WRITE,w.IMAGE,S.STATE,{hash:e,confirm:!0})}_hash(e){return crypto.subtle.digest("SHA-256",e)}async _uploadNext(){if(this._uploadOffset>=this._uploadImage.byteLength){this._uploadIsInProgress=!1,this._imageUploadFinishedCallback();return}const e=8,r={data:new Uint8Array,off:this._uploadOffset};this._uploadOffset===0&&(r.len=this._uploadImage.byteLength,r.sha=new Uint8Array(await this._hash(this._uploadImage))),this._imageUploadProgressCallback({percentage:Math.floor(this._uploadOffset/this._uploadImage.byteLength*100)});const n=this._mtu-L.encode(r).byteLength-e;r.data=new Uint8Array(this._uploadImage.slice(this._uploadOffset,this._uploadOffset+n)),this._uploadOffset+=n,this._sendMessage(A.WRITE,w.IMAGE,S.UPLOAD,r)}async cmdUpload(e,r=0){if(this._uploadIsInProgress){this._logger.error("Upload is already in progress.");return}this._uploadIsInProgress=!0,this._uploadOffset=0,this._uploadImage=e,this._uploadSlot=r,this._uploadNext()}async imageInfo(e){const r={},n=new Uint8Array(e);if(n.length<32)throw new Error("Invalid image (too short file)");if(n[0]!==61||n[1]!==184||n[2]!==243||n[3]!==150)throw new Error("Invalid image (wrong magic bytes)");if(n[4]!==0||n[5]!==0||n[6]!==0||n[7]!==0)throw new Error("Invalid image (wrong load address)");const o=n[8]+n[9]*2**8;if(n[10]!==0||n[11]!==0)throw new Error("Invalid image (wrong protected TLV area size)");const l=n[12]+n[13]*2**8+n[14]*2**16+n[15]*2**24;if(r.imageSize=l,n.length<l+o)throw new Error("Invalid image (wrong image size)");if(n[16]!==0||n[17]!==0||n[18]!==0||n[19]!==0)throw new Error("Invalid image (wrong flags)");const d=`${n[20]}.${n[21]}.${n[22]+n[23]*2**8}`;return r.version=d,r.hash=[...new Uint8Array(await this._hash(e.slice(0,l+32)))].map(m=>m.toString(16).padStart(2,"0")).join(""),r}}const D={initial:document.getElementById("initial-screen"),connected:document.getElementById("connected-screen")},J=document.getElementById("bluetooth-is-available"),Q=document.getElementById("connect-block"),k=document.getElementById("button-connect"),X=document.getElementById("button-disconnect"),H=document.getElementById("device-name"),N=document.getElementById("device-fw-version"),Z=document.getElementById("upload-status");navigator&&navigator.bluetooth&&navigator.bluetooth.getAvailability()&&(J.style.display="none",Q.style.display="block");let q=[];function ee(_,e){fetch("/firmware/MONKEY/r2/app_update_0.6.1.bin").then(r=>{console.log(r)})}ee();const p=new Y;p.onConnecting(()=>{console.log("Connecting..."),k.disabled=!0});p.onConnect(()=>{H.innerText=p.name,D.initial.style.display="none",D.connected.style.display="block",k.disabled=!0,p.cmdImageState()});p.onDisconnect(()=>{H.innerText="unknown name",N.innerHTML="",D.connected.style.display="none",D.initial.style.display="block",k.disabled=!1});p.onMessage(({op:_,group:e,id:r,data:n,length:o})=>{switch(e){case w.OS:switch(r){case C.ECHO:alert(n.r);break;case C.TASKSTAT:console.table(n.tasks);break;case C.MPSTAT:console.log(n);break}break;case w.IMAGE:switch(r){case S.STATE:q=n.images,q.forEach(l=>{l.active&&(N.innerHTML=l.version)});break}break;default:console.log("Unknown group");break}});p.onImageUploadProgress(({percentage:_})=>{Z.innerText=`${_}%`});p.onImageUploadFinished(()=>{p.cmdImageState()});k.addEventListener("click",async()=>{let e=[{namePrefix:"WAVY",services:["03B80E5A-EDE8-4B33-A751-6CE34EC4C700".toLowerCase()]}];await p.connect(e)});X.addEventListener("click",async()=>{p.disconnect()});
