!function a(b,c,d){function e(g,h){if(!c[g]){if(!b[g]){var i="function"==typeof require&&require;if(!h&&i)return i(g,!0);if(f)return f(g,!0);var j=new Error("Cannot find module '"+g+"'");throw j.code="MODULE_NOT_FOUND",j}var k=c[g]={exports:{}};b[g][0].call(k.exports,function(a){var c=b[g][1][a];return e(c?c:a)},k,k.exports,a,b,c,d)}return c[g].exports}for(var f="function"==typeof require&&require,g=0;g<d.length;g++)e(d[g]);return e}({1:[function(a,b){(function(a,c){(function(){"use strict";function d(a){return"function"==typeof a||"object"==typeof a&&null!==a}function e(a){return"function"==typeof a}function f(a){return"object"==typeof a&&null!==a}function g(){}function h(){return function(){a.nextTick(l)}}function i(){var a=0,b=new O(l),c=document.createTextNode("");return b.observe(c,{characterData:!0}),function(){c.data=a=++a%2}}function j(){var a=new MessageChannel;return a.port1.onmessage=l,function(){a.port2.postMessage(0)}}function k(){return function(){setTimeout(l,1)}}function l(){for(var a=0;L>a;a+=2){var b=Q[a],c=Q[a+1];b(c),Q[a]=void 0,Q[a+1]=void 0}L=0}function m(){}function n(){return new TypeError("You cannot resolve a promise with itself")}function o(){return new TypeError("A promises callback cannot return that same promise.")}function p(a){try{return a.then}catch(b){return U.error=b,U}}function q(a,b,c,d){try{a.call(b,c,d)}catch(e){return e}}function r(a,b,c){M(function(a){var d=!1,e=q(c,b,function(c){d||(d=!0,b!==c?u(a,c):w(a,c))},function(b){d||(d=!0,x(a,b))},"Settle: "+(a._label||" unknown promise"));!d&&e&&(d=!0,x(a,e))},a)}function s(a,b){b._state===S?w(a,b._result):a._state===T?x(a,b._result):y(b,void 0,function(b){u(a,b)},function(b){x(a,b)})}function t(a,b){if(b.constructor===a.constructor)s(a,b);else{var c=p(b);c===U?x(a,U.error):void 0===c?w(a,b):e(c)?r(a,b,c):w(a,b)}}function u(a,b){a===b?x(a,n()):d(b)?t(a,b):w(a,b)}function v(a){a._onerror&&a._onerror(a._result),z(a)}function w(a,b){a._state===R&&(a._result=b,a._state=S,0===a._subscribers.length||M(z,a))}function x(a,b){a._state===R&&(a._state=T,a._result=b,M(v,a))}function y(a,b,c,d){var e=a._subscribers,f=e.length;a._onerror=null,e[f]=b,e[f+S]=c,e[f+T]=d,0===f&&a._state&&M(z,a)}function z(a){var b=a._subscribers,c=a._state;if(0!==b.length){for(var d,e,f=a._result,g=0;g<b.length;g+=3)d=b[g],e=b[g+c],d?C(c,d,e,f):e(f);a._subscribers.length=0}}function A(){this.error=null}function B(a,b){try{return a(b)}catch(c){return V.error=c,V}}function C(a,b,c,d){var f,g,h,i,j=e(c);if(j){if(f=B(c,d),f===V?(i=!0,g=f.error,f=null):h=!0,b===f)return void x(b,o())}else f=d,h=!0;b._state!==R||(j&&h?u(b,f):i?x(b,g):a===S?w(b,f):a===T&&x(b,f))}function D(a,b){try{b(function(b){u(a,b)},function(b){x(a,b)})}catch(c){x(a,c)}}function E(a,b,c,d){this._instanceConstructor=a,this.promise=new a(m,d),this._abortOnReject=c,this._validateInput(b)?(this._input=b,this.length=b.length,this._remaining=b.length,this._init(),0===this.length?w(this.promise,this._result):(this.length=this.length||0,this._enumerate(),0===this._remaining&&w(this.promise,this._result))):x(this.promise,this._validationError())}function F(){throw new TypeError("You must pass a resolver function as the first argument to the promise constructor")}function G(){throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.")}function H(a){this._id=_++,this._state=void 0,this._result=void 0,this._subscribers=[],m!==a&&(e(a)||F(),this instanceof H||G(),D(this,a))}var I;I=Array.isArray?Array.isArray:function(a){return"[object Array]"===Object.prototype.toString.call(a)};var J,K=I,L=(Date.now||function(){return(new Date).getTime()},Object.create||function(a){if(arguments.length>1)throw new Error("Second argument not supported");if("object"!=typeof a)throw new TypeError("Argument must be an object");return g.prototype=a,new g},0),M=function(a,b){Q[L]=a,Q[L+1]=b,L+=2,2===L&&J()},N="undefined"!=typeof window?window:{},O=N.MutationObserver||N.WebKitMutationObserver,P="undefined"!=typeof Uint8ClampedArray&&"undefined"!=typeof importScripts&&"undefined"!=typeof MessageChannel,Q=new Array(1e3);J="undefined"!=typeof a&&"[object process]"==={}.toString.call(a)?h():O?i():P?j():k();var R=void 0,S=1,T=2,U=new A,V=new A;E.prototype._validateInput=function(a){return K(a)},E.prototype._validationError=function(){return new Error("Array Methods must be provided an Array")},E.prototype._init=function(){this._result=new Array(this.length)};var W=E;E.prototype._enumerate=function(){for(var a=this.length,b=this.promise,c=this._input,d=0;b._state===R&&a>d;d++)this._eachEntry(c[d],d)},E.prototype._eachEntry=function(a,b){var c=this._instanceConstructor;f(a)?a.constructor===c&&a._state!==R?(a._onerror=null,this._settledAt(a._state,b,a._result)):this._willSettleAt(c.resolve(a),b):(this._remaining--,this._result[b]=this._makeResult(S,b,a))},E.prototype._settledAt=function(a,b,c){var d=this.promise;d._state===R&&(this._remaining--,this._abortOnReject&&a===T?x(d,c):this._result[b]=this._makeResult(a,b,c)),0===this._remaining&&w(d,this._result)},E.prototype._makeResult=function(a,b,c){return c},E.prototype._willSettleAt=function(a,b){var c=this;y(a,void 0,function(a){c._settledAt(S,b,a)},function(a){c._settledAt(T,b,a)})};var X=function(a,b){return new W(this,a,!0,b).promise},Y=function(a,b){function c(a){u(f,a)}function d(a){x(f,a)}var e=this,f=new e(m,b);if(!K(a))return x(f,new TypeError("You must pass an array to race.")),f;for(var g=a.length,h=0;f._state===R&&g>h;h++)y(e.resolve(a[h]),void 0,c,d);return f},Z=function(a,b){var c=this;if(a&&"object"==typeof a&&a.constructor===c)return a;var d=new c(m,b);return u(d,a),d},$=function(a,b){var c=this,d=new c(m,b);return x(d,a),d},_=0,ab=H;H.all=X,H.race=Y,H.resolve=Z,H.reject=$,H.prototype={constructor:H,then:function(a,b){var c=this,d=c._state;if(d===S&&!a||d===T&&!b)return this;var e=new this.constructor(m),f=c._result;if(d){var g=arguments[d-1];M(function(){C(d,e,g,f)})}else y(c,e,a,b);return e},"catch":function(a){return this.then(null,a)}};var bb=function(){var a;a="undefined"!=typeof c?c:"undefined"!=typeof window&&window.document?window:self;var b="Promise"in a&&"resolve"in a.Promise&&"reject"in a.Promise&&"all"in a.Promise&&"race"in a.Promise&&function(){var b;return new a.Promise(function(a){b=a}),e(b)}();b||(a.Promise=ab)},cb={Promise:ab,polyfill:bb};"function"==typeof define&&define.amd?define(function(){return cb}):"undefined"!=typeof b&&b.exports?b.exports=cb:"undefined"!=typeof this&&(this.ES6Promise=cb)}).call(this)}).call(this,a("_process"),"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{_process:2}],2:[function(a,b){function c(){if(!g){g=!0;for(var a,b=f.length;b;){a=f,f=[];for(var c=-1;++c<b;)a[c]();b=f.length}g=!1}}function d(){}var e=b.exports={},f=[],g=!1;e.nextTick=function(a){f.push(a),g||setTimeout(c,0)},e.title="browser",e.browser=!0,e.env={},e.argv=[],e.version="",e.on=d,e.addListener=d,e.once=d,e.off=d,e.removeListener=d,e.removeAllListeners=d,e.emit=d,e.binding=function(){throw new Error("process.binding is not supported")},e.cwd=function(){return"/"},e.chdir=function(){throw new Error("process.chdir is not supported")},e.umask=function(){return 0}},{}],3:[function(a,b){"use strict";function c(a,b){for(var c in b)a[c]=b[c];return b}var d={event:function(a,b,d){var e;document.createEvent?(e=document.createEvent("HTMLEvents"),e.initEvent(b,"mouseenter"!=b&&"mouseleave"!=b,!0),c(e,d),a.dispatchEvent(e)):(e=document.createEventObject(),a.fireEvent("on"+b,e))},keyEvent:function(a,b,d){var e,f={bubbles:!0,cancelable:!0,view:window,ctrlKey:!1,altKey:!1,shiftKey:!1,metaKey:!1,keyCode:0,charCode:0};if(c(f,d),document.createEvent)try{e=document.createEvent("KeyEvents"),e.initKeyEvent(b,f.bubbles,f.cancelable,f.view,f.ctrlKey,f.altKey,f.shiftKey,f.metaKey,f.keyCode,f.charCode),a.dispatchEvent(e)}catch(g){e=document.createEvent("Events"),e.initEvent(b,f.bubbles,f.cancelable),c(e,{view:f.view,ctrlKey:f.ctrlKey,altKey:f.altKey,shiftKey:f.shiftKey,metaKey:f.metaKey,keyCode:f.keyCode,charCode:f.charCode}),a.dispatchEvent(e)}}};d.keypress=function(a,b){var c=b.charCodeAt(0);this.keyEvent(a,"keypress",{keyCode:c,charCode:c})},d.keydown=function(a,b){var c=b.charCodeAt(0);this.keyEvent(a,"keydown",{keyCode:c,charCode:c})},d.keyup=function(a,b){var c=b.charCodeAt(0);this.keyEvent(a,"keyup",{keyCode:c,charCode:c})};for(var e=["click","focus","blur","dblclick","input","change","mousedown","mousemove","mouseout","mouseover","mouseup","mouseenter","mouseleave","resize","scroll","select","submit","load","unload"],f=e.length;f--;){var g=e[f];d[g]=function(a){return function(b,c){this.event(b,a,c)}}(g)}"undefined"!=typeof b?b.exports=d:"undefined"!=typeof window?window.Simulate=d:"undefined"!=typeof define&&define(function(){return d})},{}],4:[function(a,b){(function(a){b.exports=function(){"use strict";var a=a||"undefined"!=typeof navigator&&navigator.msSaveOrOpenBlob&&navigator.msSaveOrOpenBlob.bind(navigator)||function(a){if("undefined"==typeof navigator||!/MSIE [1-9]\./.test(navigator.userAgent)){var b=a.document,c=function(){return a.URL||a.webkitURL||a},d=b.createElementNS("http://www.w3.org/1999/xhtml","a"),e="download"in d,f=function(c){var d=b.createEvent("MouseEvents");d.initMouseEvent("click",!0,!1,a,0,0,0,0,0,!1,!1,!1,!1,0,null),c.dispatchEvent(d)},g=a.webkitRequestFileSystem,h=a.requestFileSystem||g||a.mozRequestFileSystem,i=function(b){(a.setImmediate||a.setTimeout)(function(){throw b},0)},j="application/octet-stream",k=0,l=10,m=function(b){var d=function(){"string"==typeof b?c().revokeObjectURL(b):b.remove()};a.chrome?d():setTimeout(d,l)},n=function(a,b,c){b=[].concat(b);for(var d=b.length;d--;){var e=a["on"+b[d]];if("function"==typeof e)try{e.call(a,c||a)}catch(f){i(f)}}},o=function(b,i){var l,o,p,q=this,r=b.type,s=!1,t=function(){n(q,"writestart progress write writeend".split(" "))},u=function(){if((s||!l)&&(l=c().createObjectURL(b)),o)o.location.href=l;else{var d=a.open(l,"_blank");void 0==d&&"undefined"!=typeof safari&&(a.location.href=l)}q.readyState=q.DONE,t(),m(l)},v=function(a){return function(){return q.readyState!==q.DONE?a.apply(this,arguments):void 0}},w={create:!0,exclusive:!1};return q.readyState=q.INIT,i||(i="download"),e?(l=c().createObjectURL(b),d.href=l,d.download=i,f(d),q.readyState=q.DONE,t(),void m(l)):(a.chrome&&r&&r!==j&&(p=b.slice||b.webkitSlice,b=p.call(b,0,b.size,j),s=!0),g&&"download"!==i&&(i+=".download"),(r===j||g)&&(o=a),h?(k+=b.size,void h(a.TEMPORARY,k,v(function(a){a.root.getDirectory("saved",w,v(function(a){var c=function(){a.getFile(i,w,v(function(a){a.createWriter(v(function(c){c.onwriteend=function(b){o.location.href=a.toURL(),q.readyState=q.DONE,n(q,"writeend",b),m(a)},c.onerror=function(){var a=c.error;a.code!==a.ABORT_ERR&&u()},"writestart progress write abort".split(" ").forEach(function(a){c["on"+a]=q["on"+a]}),c.write(b),q.abort=function(){c.abort(),q.readyState=q.DONE},q.readyState=q.WRITING}),u)}),u)};a.getFile(i,{create:!1},v(function(a){a.remove(),c()}),v(function(a){a.code===a.NOT_FOUND_ERR?c():u()}))}),u)}),u)):void u())},p=o.prototype,q=function(a,b){return new o(a,b)};return p.abort=function(){var a=this;a.readyState=a.DONE,n(a,"abort")},p.readyState=p.INIT=0,p.WRITING=1,p.DONE=2,p.error=p.onwritestart=p.onprogress=p.onwrite=p.onabort=p.onerror=p.onwriteend=null,q}}("undefined"!=typeof self&&self||"undefined"!=typeof window&&window||this.content);return"undefined"!=typeof b&&null!==b?b.exports=a:"undefined"!=typeof define&&null!==define&&null!=define.amd&&define([],function(){return a}),{}}.call("undefined"!=typeof a?a:this)}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{}],5:[function(a){"use strict";var b=a("../utme"),c=a("./FileSaver");b.registerSaveHandler(function(a){var b=new Blob([JSON.stringify(a,null," ")],{type:"text/plain;charset=utf-8"});c(b,a.name+".json")})},{"../utme":9,"./FileSaver":4}],6:[function(a){"use strict";function b(a){a=a.replace(/[\[]/,"\\[").replace(/[\]]/,"\\]");var b=new RegExp("[\\?&]"+a+"=([^&#]*)"),c=b.exec(location.search);return null===c?"":decodeURIComponent(c[1].replace(/\+/g," "))}var c=a("../utme.js"),d={baseUrl:b("utme_test_server")||"http://0.0.0.0:9043/",error:function(a){$.ajax({type:"POST",url:d.baseUrl+"error",data:{data:a},dataType:"json"}),console.error(a)},log:function(a){$.ajax({type:"POST",url:d.baseUrl+"log",data:{data:a},dataType:"json"}),console.log(a)},loadScenario:function(a,b){$.ajax({jsonp:"callback",contentType:"application/json; charset=utf-8",crossDomain:!0,url:d.baseUrl+"scenario/"+a,dataType:"jsonp",success:function(a){b(a)}})},saveScenario:function(a){$.ajax({type:"POST",url:d.baseUrl+"scenario",data:JSON.stringify(a,null," "),dataType:"json",contentType:"application/json"})}};c.registerReportHandler(d),c.registerLoadHandler(d.loadScenario),c.registerSaveHandler(d.saveScenario)},{"../utme.js":9}],7:[function(a,b){"use strict";function c(a,b){function c(a){return 1==b.querySelectorAll(d(a)).length}function d(a){return a.map(function(a){return a.selector}).join(" > ")}if(!a||!a.tagName)throw new TypeError("Element expected");for(var f=e(a,c),g=0,h=b.querySelectorAll(d(f)),i=0;i<h.length;i++)if(h[i]===a){g=i;break}return d(f)+":eq("+g+")"}function d(a){var b=a.getAttribute("class");return b=b&&b.replace("utme-verify",""),b=b&&b.replace("utme-ready",""),b&&b.trim().length?(b=b.replace(/\s+/g," "),b=b.replace(/^\s+|\s+$/g,""),b.trim().split(" ")):[]}function e(a){var b=[],c=null,e=null,f=null,g=null,h=null;if(a.id)c="[id='"+a.id+"']";else{c=a.tagName.toLowerCase();var i=d(a);i.length&&(c+="."+i.join("."))}if((e=a.getAttribute("title"))?c+='[title="'+e+'"]':(f=a.getAttribute("alt"))?c+='[alt="'+f+'"]':(g=a.getAttribute("name"))&&(c+='[name="'+g+'"]'),(h=a.getAttribute("value"))&&(c+='[value="'+h+'"]'),b.unshift({element:a,selector:c}),!b.length)throw new Error("Failed to identify CSS selector");return b}b.exports=c},{}],8:[function(a,b){"use strict";function c(a,b){for(var c in b)a[c]=b[c];return b}var d={event:function(a,b,d){var e;document.createEvent?(e=document.createEvent("HTMLEvents"),e.initEvent(b,"mouseenter"!=b&&"mouseleave"!=b,!0),c(e,d),a.dispatchEvent(e)):(e=document.createEventObject(),a.fireEvent("on"+b,e))},keyEvent:function(a,b,d){var e,f={bubbles:!0,cancelable:!0,view:window,ctrlKey:!1,altKey:!1,shiftKey:!1,metaKey:!1,keyCode:0,charCode:0};if(c(f,d),document.createEvent)try{e=document.createEvent("KeyEvents"),e.initKeyEvent(b,f.bubbles,f.cancelable,f.view,f.ctrlKey,f.altKey,f.shiftKey,f.metaKey,f.keyCode,f.charCode),a.dispatchEvent(e)}catch(g){e=document.createEvent("Events"),e.initEvent(b,f.bubbles,f.cancelable),c(e,{view:f.view,ctrlKey:f.ctrlKey,altKey:f.altKey,shiftKey:f.shiftKey,metaKey:f.metaKey,keyCode:f.keyCode,charCode:f.charCode}),a.dispatchEvent(e)}}};d.keypress=function(a,b){var c=b.charCodeAt(0);this.keyEvent(a,"keypress",{keyCode:c,charCode:c})},d.keydown=function(a,b){var c=b.charCodeAt(0);this.keyEvent(a,"keydown",{keyCode:c,charCode:c})},d.keyup=function(a,b){var c=b.charCodeAt(0);this.keyEvent(a,"keyup",{keyCode:c,charCode:c})};for(var e=["click","focus","blur","dblclick","input","change","mousedown","mousemove","mouseout","mouseover","mouseup","mouseenter","mouseleave","resize","scroll","select","submit","load","unload"],f=e.length;f--;){var g=e[f];d[g]=function(a){return function(b,c){this.event(b,a,c)}}(g)}"undefined"!=typeof b?b.exports=d:"undefined"!=typeof window?window.Simulate=d:"undefined"!=typeof define&&define(function(){return d})},{}],9:[function(a,b){(function(c){"use strict";function d(a){return new z(function(b){if(0===F.length)for(var c=J.state,d=0;d<c.scenarios.length;d++)c.scenarios[d].name===a&&b(c.scenarios[d]);else F[0](a,function(a){b(a)})})}function e(a){var b=a.setup;return z.all(b&&b.scenarios||[]).map(function(a){return d(a).then(function(a){return a=JSON.parse(JSON.stringify(a)),a.steps})})}function f(a){var b=a.cleanup;return z.all(b&&b.scenarios||[]).map(function(a){return d(a).then(function(a){return a=JSON.parse(JSON.stringify(a)),a.steps})})}function g(a){for(var b,c=[],d=0;d<a.length;d++){var e=a[d];if(d>0)for(var f=0;f<a.length;f++){var g=e[f],h=f>0?g.timeStamp-e[f-1].timeStamp:50;b+=h,e[f].timeStamp=b}else b=e[d].timeStamp;c=c.concat(e)}return c}function h(a){return z.all([e(a),f(a)]).then(function(b){var c=b[0].concat([a.steps],b[1]);a.steps=g(c)})}function i(a,b,c){J.broadcast("RUNNING_STEP"),c=c||{};var d=a.steps[b],e=J.state;if(d&&"PLAYING"==e.status)if(e.run.scenario=a,e.run.stepIndex=b,"load"==d.eventName){var f=d.data.url.protocol+"//"+d.data.url.host+"/",g=d.data.url.search,h=d.data.url.hash,i=w("utme_test_server");i&&(g+=(g?"&":"?")+"utme_test_server="+i),window.location.replace(f+g+h),window.location.reload(!0)}else if("timeout"==d.eventName)e.autoRun&&o(a,b,c,d.data.amount);else{var j=d.data.locator,p=a.steps,q=r(d);if("undefined"==typeof c[q]&&"realtime"!=J.state.run.speed){for(var s,t=!1,u=p.length-1;u>b;u--){var v=p[u],x=r(v);if(q===x)if(s){if(l(v)){t=!1;break}}else s=v.timeStamp-d.timeStamp,t=!k(v)&&C>s}c[q]=t}c[r(d)]?o(a,b,c):(console.log("scenario: "+a.name+", step: "+b),m(a,d,j,n(a,b)).then(function(f){var g=f[0];if(G.indexOf(d.eventName)>=0){var h={};d.data.button&&(h.which=h.button=d.data.button),"click"==d.eventName?$(g).trigger("click"):"focus"!=d.eventName&&"blur"!=d.eventName||!g[d.eventName]?A[d.eventName](g,h):g[d.eventName](),"undefined"!=typeof d.data.value&&(g.value=d.data.value,"input"===g.tagName.toLowerCase()&&A.event(g,"input"),A.event(g,"change"))}if("keypress"==d.eventName){var i=String.fromCharCode(d.data.keyCode);A.keypress(g,i),A.keydown(g,i),g.value=d.data.value,A.event(g,"change"),A.keyup(g,i)}"validate"==d.eventName&&J.reportLog("Validate: "+JSON.stringify(j.selectors)+" contains text '"+d.data.text+"'"),e.autoRun&&o(a,b,c)},function(f){"validate"==d.eventName?(J.reportLog("Validate: "+f),J.stopScenario(!1)):(J.reportLog(f),e.autoRun&&o(a,b,c))}))}}function j(a){var b=document.querySelector(a);return new z(function(c,d){try{if(!window.angular)throw new Error("angular could not be found on the window");if(angular.getTestability)angular.getTestability(b).whenStable(c);else{if(!angular.element(b).injector())throw new Error("root element ("+a+") has no injector. this may mean it is not inside ng-app.");angular.element(b).injector().get("$browser").notifyWhenNoOutstandingRequests(c)}}catch(e){d(e)}})}function k(a){return"mouseleave"!=a.eventName&&"mouseout"!=a.eventName&&"blur"!=a.eventName}function l(){}function m(a,b,d,e){var f;return new z(function(a,g){function h(){f||(f=(new Date).getTime());var c,i=!1,j=!1,l=!1,m=d.selectors.slice(0),n=b.data.text,o=b.data.comparison||"equals";m.unshift('[data-unique-id="'+d.uniqueId+'"]');for(var p=0;p<m.length;p++){var q=m[p];if(k(b)&&(q+=":visible"),c=$(q),1==c.length){if("undefined"==typeof n){j=!0,c.attr("data-unique-id",d.uniqueId);break}var r=$(c[0]).text();if("equals"===o&&r===n||"contains"===o&&r.indexOf(n)>=0){j=!0;break}l=!0;break}c.length>1&&(i=!0)}if(j)a(c);else if(k(b)&&(new Date).getTime()-f<5*e)setTimeout(h,50);else{var s="";s=i?"Could not find appropriate element for selectors: "+JSON.stringify(d.selectors)+" for event "+b.eventName+".  Reason: Found Too Many Elements":l?"Could not find appropriate element for selectors: "+JSON.stringify(d.selectors)+" for event "+b.eventName+".  Reason: Text doesn't match.  \nExpected:\n"+n+"\nbut was\n"+c.text()+"\n":"Could not find appropriate element for selectors: "+JSON.stringify(d.selectors)+" for event "+b.eventName+".  Reason: No elements found",g(s)}}var i=C/("realtime"==J.state.run.speed?"1":J.state.run.speed);c.angular?j("[ng-app]").then(function(){"realtime"===J.state.run.speed?setTimeout(h,e):"fastest"===J.state.run.speed?h():setTimeout(h,Math.min(e*J.state.run.speed,i))}):"realtime"===J.state.run.speed?setTimeout(h,e):"fastest"===J.state.run.speed?h():setTimeout(h,Math.min(e*J.state.run.speed,i))})}function n(a,b){return b>0?"validate"==a.steps[b-1].eventName?0:a.steps[b].timeStamp-a.steps[b-1].timeStamp:0}function o(a,b,c,d){setTimeout(function(){a.steps.length>b+1?i(a,b+1,c):J.stopScenario(!0)},d||0)}function p(a){var b=document.createElement("template");return b.innerHTML=a,b.content?b.content:b}function q(a){for(var b=0;b<a.length;b++){var c=a[b],d=c&&c.data.locator,e=d&&d.selectors[0];e&&e.doc&&J.finalizeLocator(d)}}function r(a){return a&&a.data&&a.data.locator&&a.data.locator.uniqueId}function s(a,b){$(a).toggleClass("utme-verify",b)}function t(a,b){$(a).toggleClass("utme-ready",b)}function u(a){return 0==$(a).parents("label").length||"input"==a.nodeName.toLowerCase()}function v(){function a(a){if(!a.isTrigger&&J.isRecording()&&a.target.hasAttribute&&!a.target.hasAttribute("data-ignore")&&0==$(a.target).parents("[data-ignore]").length){var b=a.which;c.hasOwnProperty(b)&&(b=c[b]),b=!a.shiftKey&&b>=65&&90>=b?String.fromCharCode(b+32):a.shiftKey&&d.hasOwnProperty(b)?d[b]:String.fromCharCode(b),J.registerEvent("keypress",{locator:J.createElementLocator(a.target),key:b,prevValue:a.target.value,value:a.target.value+b,keyCode:a.keyCode})}}for(var b=0;b<G.length;b++)document.addEventListener(G[b],function(a){var b=function(b){if(!b.isTrigger&&J.isRecording()&&b.target.hasAttribute&&!b.target.hasAttribute("data-ignore")&&0==$(b.target).parents("[data-ignore]").length&&u(b.target)){var c=J.state.steps.length,d={locator:J.createElementLocator(b.target)};if((b.which||b.button)&&(d.button=b.which||b.button),"mouseover"==a&&(s(b.target,!0),K.push({element:b.target,timer:setTimeout(function(){t(b.target,!0),s(b.target,!1)},500)})),"mouseout"==a){for(var e=0;e<K.length;e++)if(K[e].element==b.target){clearTimeout(K[e].timer),K.splice(e,1);break}s(b.target,!1),t(b.target,!1)}"change"==a&&(d.value=b.target.value),J.registerEvent(a,d,c)}};return(J.eventListeners=J.eventListeners||{})[a]=b,b}(G[b]),!0);var c={188:"44",109:"45",190:"46",191:"47",192:"96",220:"92",222:"39",221:"93",219:"91",173:"45",187:"61",186:"59",189:"45"},d={96:"~",49:"!",50:"@",51:"#",52:"$",53:"%",54:"^",55:"&",56:"*",57:"(",48:")",45:"_",61:"+",91:"{",93:"}",92:"|",59:":",39:'"',44:"<",46:">",47:"?"};document.addEventListener("keypress",a,!0),(J.eventListeners=J.eventListeners||{}).keypress=a}function w(a){a=a.replace(/[\[]/,"\\[").replace(/[\]]/,"\\]");var b=new RegExp("[\\?&]"+a+"=([^&#]*)"),c=b.exec(location.search);return null===c?"":decodeURIComponent(c[1].replace(/\+/g," "))}function x(){"complete"==document.readyState&&(J.init(),v(),J.isRecording()&&J.registerEvent("load",{url:{protocol:window.location.protocol,host:window.location.host,search:window.location.search,hash:window.location.hash}}))}var y,z=a("es6-promise").Promise,A=a("./Simulate"),B=a("./selectorFinder"),C=500,D=[],E=[],F=[],G=["click","focus","blur","dblclick","mousedown","mouseenter","mouseleave","mouseout","mouseover","mouseup","change"],H=function(){function a(){return Math.floor(65536*(1+Math.random())).toString(16).substring(1)}return function(){return a()+a()+"-"+a()+"-"+a()+"-"+a()+"-"+a()+a()+a()}}(),I=[],J={state:y,init:function(){var a=w("utme_scenario");a?(localStorage.clear(),y=J.state=J.loadStateFromStorage(),J.broadcast("INITIALIZED"),setTimeout(function(){y.autoRun=!0;var b=w("utme_run_config");b&&(b=JSON.parse(b)),b=b||{};var c=w("utme_run_speed");c&&(b.speed=c),J.runScenario(a,b)},2e3)):(y=J.state=J.loadStateFromStorage(),J.broadcast("INITIALIZED"),"PLAYING"===y.status?o(y.run.scenario,y.run.stepIndex):y.status&&"INITIALIZING"!==y.status||(y.status="LOADED"))},broadcast:function(a,b){if(I&&I.length)for(var c=0;c<I.length;c++)I[c](a,b)},startRecording:function(){"RECORDING"!=y.status&&(y.status="RECORDING",y.steps=[],J.reportLog("Recording Started"),J.broadcast("RECORDING_STARTED"),J.registerEvent("load",{url:{protocol:window.location.protocol,host:window.location.host,search:window.location.search,hash:window.location.hash}}))},runScenario:function(a,b){var c=a||prompt("Scenario to run"),e=a?!0:"y"!=prompt("Would you like to step through each step (y|n)?");return d(c).then(function(c){c=JSON.parse(JSON.stringify(c)),J.state.run=$.extend({speed:"10"},b),h(c).then(function(){y.autoRun=e===!0,y.status="PLAYING",J.reportLog("Starting Scenario '"+a+"'",c),J.broadcast("PLAYBACK_STARTED"),i(c,0)})})},runNextStep:o,stopScenario:function(a){var b=y.run.scenario;delete y.run,y.status="LOADED",J.broadcast("PLAYBACK_STOPPED"),J.reportLog("Stopping Scenario"),a?J.reportLog("[SUCCESS] Scenario '"+b.name+"' Completed!"):J.reportError("[FAILURE] Scenario '"+b.name+"' Completed!")},createElementLocator:function(a){var b=a.getAttribute("data-unique-id")||H();a.setAttribute("data-unique-id",b);var c=a.cloneNode().outerHTML,d=[];if("BODY"==a.tagName.toUpperCase()||"HTML"==a.tagName.toUpperCase())var d=[a.tagName];else var e=document.body.innerHTML,d=[{doc:e,id:b,ele:c}];return{uniqueId:b,selectors:d}},finalizeLocator:function(a){var b=a.selectors[0],c=p(b.doc),d=c.querySelectorAll("[data-unique-id='"+b.id+"']");a.selectors=[B(d[0],c)]},registerEvent:function(a,b,c){(J.isRecording()||J.isValidating())&&("undefined"==typeof c&&(c=J.state.steps.length),y.steps[c]={eventName:a,timeStamp:(new Date).getTime(),data:b},J.broadcast("EVENT_REGISTERED"))},reportLog:function(a,b){if(E&&E.length)for(var c=0;c<E.length;c++)E[c].log(a,b,J)},reportError:function(a,b){if(E&&E.length)for(var c=0;c<E.length;c++)E[c].error(a,b,J)},registerListener:function(a){I.push(a)},registerSaveHandler:function(a){D.push(a)},registerReportHandler:function(a){E.push(a)},registerLoadHandler:function(a){F.push(a)},isRecording:function(){return 0===J.state.status.indexOf("RECORDING")},isPlaying:function(){return 0===J.state.status.indexOf("PLAYING")},isValidating:function(a){return"undefined"!=typeof a&&(J.isRecording()||J.isValidating())&&(J.state.status=a?"VALIDATING":"RECORDING",J.broadcast("VALIDATION_CHANGED")),0===J.state.status.indexOf("VALIDATING")},stopRecording:function(a){if(a!==!1){var b={steps:y.steps};if($.extend(b,a),b.name||(b.name=prompt("Enter scenario name")),b.name&&(q(b.steps),y.scenarios.push(b),D&&D.length))for(var c=0;c<D.length;c++)D[c](b,J)}y.status="LOADED",J.broadcast("RECORDING_STOPPED"),J.reportLog("Recording Stopped",b)},loadStateFromStorage:function(){var a=localStorage.getItem("utme");return y=a?JSON.parse(a):{status:"INITIALIZING",scenarios:[]}},saveStateToStorage:function(a){a?localStorage.setItem("utme",JSON.stringify(a)):localStorage.removeItem("utme")},unload:function(){J.saveStateToStorage(y)}},K=[];x(),document.addEventListener("readystatechange",x),window.addEventListener("unload",function(){J.unload()},!0),window.addEventListener("error",function(a){J.reportLog("Script Error: "+a.message+":"+a.url+","+a.line+":"+a.col)}),b.exports=J}).call(this,"undefined"!=typeof global?global:"undefined"!=typeof self?self:"undefined"!=typeof window?window:{})},{"./Simulate":3,"./selectorFinder":7,"es6-promise":1}]},{},[4,5,6,7,8,9]);