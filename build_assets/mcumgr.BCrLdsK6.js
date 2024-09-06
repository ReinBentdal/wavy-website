var W=5960464477539063e-23,D=4294967296,G=9007199254740992;function q(A){var e=new ArrayBuffer(256),a=new DataView(e),n,o=0;function l(t){for(var c=e.byteLength,i=o+t;c<i;)c<<=1;if(c!==e.byteLength){var s=a;e=new ArrayBuffer(c),a=new DataView(e);for(var h=o+3>>2,r=0;r<h;++r)a.setUint32(r<<2,s.getUint32(r<<2))}return n=t,a}function u(){o+=n}function d(t){u(l(8).setFloat64(o,t))}function g(t){u(l(1).setUint8(o,t))}function w(t){for(var c=l(t.length),i=0;i<t.length;++i)c.setUint8(o+i,t[i]);u()}function _(t){u(l(2).setUint16(o,t))}function p(t){u(l(4).setUint32(o,t))}function x(t){var c=t%D,i=(t-c)/D,s=l(8);s.setUint32(o,i),s.setUint32(o+4,c),u()}function I(t,c){c<24?g(t<<5|c):c<256?(g(t<<5|24),g(c)):c<65536?(g(t<<5|25),_(c)):c<4294967296?(g(t<<5|26),p(c)):(g(t<<5|27),x(c))}function E(t){var c;if(t===!1)return g(244);if(t===!0)return g(245);if(t===null)return g(246);if(t===void 0)return g(247);switch(typeof t){case"number":if(Math.floor(t)===t){if(0<=t&&t<=G)return I(0,t);if(-G<=t&&t<0)return I(1,-(t+1))}return g(251),d(t);case"string":var i=[];for(c=0;c<t.length;++c){var s=t.charCodeAt(c);s<128?i.push(s):s<2048?(i.push(192|s>>6),i.push(128|s&63)):s<55296?(i.push(224|s>>12),i.push(128|s>>6&63),i.push(128|s&63)):(s=(s&1023)<<10,s|=t.charCodeAt(++c)&1023,s+=65536,i.push(240|s>>18),i.push(128|s>>12&63),i.push(128|s>>6&63),i.push(128|s&63))}return I(3,i.length),w(i);default:var h;if(Array.isArray(t))for(h=t.length,I(4,h),c=0;c<h;++c)E(t[c]);else if(t instanceof Uint8Array)I(2,t.length),w(t);else{var r=Object.keys(t);for(h=r.length,I(5,h),c=0;c<h;++c){var f=r[c];E(f),E(t[f])}}}}if(E(A),"slice"in e)return e.slice(0,o);for(var y=new ArrayBuffer(o),R=new DataView(y),b=0;b<o;++b)R.setUint8(b,a.getUint8(b));return y}function B(A,e,a){var n=new DataView(A),o=0;typeof e!="function"&&(e=function(i){return i}),typeof a!="function"&&(a=function(){});function l(i,s){return o+=i,s}function u(i){return l(i,new Uint8Array(A,o,i))}function d(){var i=new ArrayBuffer(4),s=new DataView(i),h=p(),r=h&32768,f=h&31744,U=h&1023;if(f===31744)f=261120;else if(f!==0)f+=114688;else if(U!==0)return(r?-1:1)*U*W;return s.setUint32(0,r<<16|f<<13|U<<13),s.getFloat32(0)}function g(){return l(4,n.getFloat32(o))}function w(){return l(8,n.getFloat64(o))}function _(){return l(1,n.getUint8(o))}function p(){return l(2,n.getUint16(o))}function x(){return l(4,n.getUint32(o))}function I(){return x()*D+x()}function E(){return n.getUint8(o)!==255?!1:(o+=1,!0)}function y(i){if(i<24)return i;if(i===24)return _();if(i===25)return p();if(i===26)return x();if(i===27)return I();if(i===31)return-1;throw"Invalid length encoding"}function R(i){var s=_();if(s===255)return-1;var h=y(s&31);if(h<0||s>>5!==i)throw"Invalid indefinite length element";return h}function b(i,s){for(var h=0;h<s;++h){var r=_();r&128&&(r<224?(r=(r&31)<<6|_()&63,s-=1):r<240?(r=(r&15)<<12|(_()&63)<<6|_()&63,s-=2):(r=(r&15)<<18|(_()&63)<<12|(_()&63)<<6|_()&63,s-=3)),r<65536?i.push(r):(r-=65536,i.push(55296|r>>10),i.push(56320|r&1023))}}function t(){var i=_(),s=i>>5,h=i&31,r,f;if(s===7)switch(h){case 25:return d();case 26:return g();case 27:return w()}if(f=y(h),f<0&&(s<2||6<s))throw"Invalid length";switch(s){case 0:return f;case 1:return-1-f;case 2:if(f<0){for(var U=[],L=0;(f=R(s))>=0;)L+=f,U.push(u(f));var O=new Uint8Array(L),P=0;for(r=0;r<U.length;++r)O.set(U[r],P),P+=U[r].length;return O}return u(f);case 3:var C=[];if(f<0)for(;(f=R(s))>=0;)b(C,f);else b(C,f);return String.fromCharCode.apply(null,C);case 4:var T;if(f<0)for(T=[];!E();)T.push(t());else for(T=new Array(f),r=0;r<f;++r)T[r]=t();return T;case 5:var k={};for(r=0;r<f||f<0&&!E();++r){var V=t();k[V]=t()}return k;case 6:return e(t(),f);case 7:switch(f){case 20:return!1;case 21:return!0;case 22:return null;case 23:return;default:return a(f)}}}var c=t();if(o!==A.byteLength)throw"Remaining bytes";return c}const M={encode:q,decode:B},v={READ:0,READ_RSP:1,WRITE:2,WRITE_RSP:3},m={OS:0,IMAGE:1,STAT:2,CONFIG:3,LOG:4,CRASH:5,SPLIT:6,RUN:7,FS:8,SHELL:9},F={ECHO:0,CONS_ECHO_CTRL:1,TASKSTAT:2,MPSTAT:3,DATETIME_STR:4,RESET:5},S={STATE:0,UPLOAD:1,FILE:2,CORELIST:3,CORELOAD:4,ERASE:5};class H{constructor(e={}){this.SMP_SERVICE_UUID="8d53dc1d-1db7-4cd3-868b-8a527460aa84",this.SMP_CHARACTERISTIC_UUID="da2e7828-fbce-4e01-ae9e-261174997c48",this._mtu=140,this._device=null,this._service=null,this._characteristic=null,this._connectCallback=null,this._connectingCallback=null,this._disconnectCallback=null,this._connectionLossCallback=null,this._messageCallback=null,this._imageUploadProgressCallback=null,this._uploadIsInProgress=!1,this._buffer=new Uint8Array,this._logger=e.logger||{info:console.log,error:console.error},this._seq=0,this._userRequestedDisconnect=!1}async _requestDevice(e){const a={acceptAllDevices:!1,optionalServices:[this.SMP_SERVICE_UUID]};return e&&(a.filters=e,a.acceptAllDevices=!1),navigator.bluetooth.requestDevice(a)}async connect(e){try{this._device=await this._requestDevice(e),this._logger.info(`Connecting to device ${this.name}...`),this._device.addEventListener("gattserverdisconnected",async a=>{this._logger.info(a),this._userRequestedDisconnect===!1?(this._logger.info("Trying to reconnect"),await new Promise(n=>setTimeout(n,1e3)),this._connectionLossCallback&&this._connectionLossCallback(),await this._connect()):this._disconnected()}),await this._connect()}catch(a){this._logger.error(a),await this._disconnected();return}}async _connect(){try{this._connectingCallback&&this._connectingCallback();const e=await this._device.gatt.connect();this._logger.info("Server connected."),this._service=await e.getPrimaryService(this.SMP_SERVICE_UUID),this._logger.info("Service connected."),this._characteristic=await this._service.getCharacteristic(this.SMP_CHARACTERISTIC_UUID),this._characteristic.addEventListener("characteristicvaluechanged",this._notification.bind(this)),await this._characteristic.startNotifications(),await this._connected(),this._uploadIsInProgress&&this._uploadNext()}catch(e){this._logger.error(e),await this._disconnected()}}disconnect(){return this._userRequestedDisconnect=!0,this._device.gatt.disconnect()}onConnecting(e){return this._connectingCallback=e,this}onConnect(e){return this._connectCallback=e,this}onDisconnect(e){return this._disconnectCallback=e,this}onConnectionLoss(e){return this._connectionLossCallback=e,this}onMessage(e){return this._messageCallback=e,this}onImageUploadProgress(e){return this._imageUploadProgressCallback=e,this}onImageUploadFinished(e){return this._imageUploadFinishedCallback=e,this}async _connected(){this._connectCallback&&this._connectCallback()}async _disconnected(){this._logger.info("Disconnected."),this._disconnectCallback&&this._disconnectCallback(),this._device=null,this._service=null,this._characteristic=null,this._uploadIsInProgress=!1,this._userRequestedDisconnect=!1}get name(){return this._device&&this._device.name}async _sendMessage(e,a,n,o){let u=[];typeof o<"u"&&(u=[...new Uint8Array(M.encode(o))]);const d=u.length&255,g=u.length>>8,w=a&255,_=a>>8,p=[e,0,g,d,_,w,this._seq,n,...u];await this._characteristic.writeValueWithoutResponse(Uint8Array.from(p)),this._seq=(this._seq+1)%256}_notification(e){const a=new Uint8Array(e.target.value.buffer);this._buffer=new Uint8Array([...this._buffer,...a]);const n=this._buffer[2]*256+this._buffer[3];this._buffer.length<n+8||(this._processMessage(this._buffer.slice(0,n+8)),this._buffer=this._buffer.slice(n+8))}_processMessage(e){const[a,n,o,l,u,d,g,w]=e,_=M.decode(e.slice(8).buffer),p=o*256+l,x=u*256+d;if(x===m.IMAGE&&w===S.UPLOAD&&(_.rc===0||_.rc===void 0)&&_.off){this._uploadOffset=_.off,this._uploadNext();return}this._messageCallback&&this._messageCallback({op:a,group:x,id:w,data:_,length:p})}cmdReset(){return this._sendMessage(v.WRITE,m.OS,F.RESET)}smpEcho(e){return this._sendMessage(v.WRITE,m.OS,F.ECHO,{d:e})}cmdImageState(){return this._sendMessage(v.READ,m.IMAGE,S.STATE)}cmdImageErase(){return this._sendMessage(v.WRITE,m.IMAGE,S.ERASE,{})}cmdImageTest(e){return this._sendMessage(v.WRITE,m.IMAGE,S.STATE,{hash:e,confirm:!1})}cmdImageConfirm(e){return this._sendMessage(v.WRITE,m.IMAGE,S.STATE,{hash:e,confirm:!0})}_hash(e){return crypto.subtle.digest("SHA-256",e)}async _uploadNext(){if(this._uploadOffset>=this._uploadImage.byteLength){this._uploadIsInProgress=!1,this._imageUploadFinishedCallback();return}const e=8,a={data:new Uint8Array,off:this._uploadOffset};this._uploadOffset===0&&(a.len=this._uploadImage.byteLength,a.sha=new Uint8Array(await this._hash(this._uploadImage))),this._imageUploadProgressCallback({percentage:Math.floor(this._uploadOffset/this._uploadImage.byteLength*100)});const n=this._mtu-M.encode(a).byteLength-e;a.data=new Uint8Array(this._uploadImage.slice(this._uploadOffset,this._uploadOffset+n)),this._uploadOffset+=n,this._sendMessage(v.WRITE,m.IMAGE,S.UPLOAD,a)}async cmdUpload(e,a=0){if(this._uploadIsInProgress){this._logger.error("Upload is already in progress.");return}this._uploadIsInProgress=!0,this._uploadOffset=0,this._uploadImage=e,this._uploadSlot=a,this._uploadNext()}async imageInfo(e){const a={},n=new Uint8Array(e);if(n.length<32)throw new Error("Invalid image (too short file)");if(n[0]!==61||n[1]!==184||n[2]!==243||n[3]!==150)throw new Error("Invalid image (wrong magic bytes)");if(n[4]!==0||n[5]!==0||n[6]!==0||n[7]!==0)throw new Error("Invalid image (wrong load address)");const o=n[8]+n[9]*2**8;if(n[10]!==0||n[11]!==0)throw new Error("Invalid image (wrong protected TLV area size)");const l=n[12]+n[13]*2**8+n[14]*2**16+n[15]*2**24;if(a.imageSize=l,n.length<l+o)throw new Error("Invalid image (wrong image size)");if(n[16]!==0||n[17]!==0||n[18]!==0||n[19]!==0)throw new Error("Invalid image (wrong flags)");const u=`${n[20]}.${n[21]}.${n[22]+n[23]*2**8}`;return a.version=u,a.hash=[...new Uint8Array(await this._hash(e.slice(0,l+32)))].map(d=>d.toString(16).padStart(2,"0")).join(""),a}}export{S as I,H as M,F as O,m as a};