// https://github.com/JayrAlencar/buscaBR.js/
!function(){"use strict";var e={};"undefined"!=typeof exports?("undefined"!=typeof module&&module.exports&&(exports=module.exports=e),exports.buscaBR=e):window.buscaBR=e;var o=[[/BL|BR/,"B"],["PH","F"],[/GL|GR|MG|NG|RG/,"G"],["Y","I"],[/GE|GI|RJ|MJ/,"J"],[/CA|CO|CU|CK|Q/,"K"],["N","M"],[/AO|AUM|GM|MD|OM|ON/,"M"],["PR","P"],["L","R"],[/CE|CI|CH|CS|RS|TS|X|Z/,"S"],[/TR|TL/,"T"],[/CT|RT|ST|PT/,"T"],[/\b[UW]/,"V"],["RM","SM"],[/[MRS]+\b/,""],[/[AEIOUH]/,""]];e.searchSync=function(e,n){var o,r=[];for(o=0;o<n.length;o++)this.encode(e)==this.encode(n[o])&&r.push({termo:n[o],index:o});return r.length?r:new Error("Não há registros")},e.search=function(e,n,o){!function(e,n){e=1<n.length?e instanceof Error?[e,null]:[null,e]:[e];n.apply(this,e)}(this.searchSync(e,n),o)},e.encode=function(e){e=function(e){var n,o;for(e=e.split(""),n=0;n<e.length;n++)-1!=(o="ÀÁÂÃÄÅàáâãäåÒÓÔÕÕÖØòóôõöøÈÉÊËèéêëðÇçÐÌÍÎÏìíîïÙÚÛÜùúûüÑñŠšŸÿýŽž".indexOf(e[n]))&&(e[n]="AAAAAAaaaaaaOOOOOOOooooooEEEEeeeeeCcDIIIIiiiiUUUUuuuuNnSsYyyZz"[o]);return(e=e.join("")).replace(/[^a-z0-9\s]/gi,"")}(e.toUpperCase());for(var n=0;n<o.length;n++)e=e.split(o[n][0]).join(o[n][1]);return e=(e||"").replace(/(.)(?=\1)/g,"")}}();