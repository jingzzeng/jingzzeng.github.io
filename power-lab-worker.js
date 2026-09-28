'use strict';
importScripts('vendor/jstat.min.js','power-lab-core.js');
self.onmessage=({data})=>{try{const result=PowerLabStats.simulate(data.config,data.seed,progress=>self.postMessage({type:'progress',progress}));self.postMessage({type:'result',result});}catch(error){self.postMessage({type:'error',message:error.message});}};
