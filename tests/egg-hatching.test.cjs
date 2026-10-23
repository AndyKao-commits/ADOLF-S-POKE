const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
function api(){const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/future-use/egg-hatching/egg-hatching.js'),'utf8'),context);return context.EggHatching;}
test('completion is emitted once, including after repeated skips and updates',()=>{
 let calls=0;const a=api().create({onComplete:()=>calls++});a.start({tier:'epic'});assert.equal(a.start({tier:'common'}),false);a.update(1.35);assert.equal(calls,0);a.update(.5);a.skip();a.update(10);assert.equal(calls,1);assert.equal(a.state().phase,'complete');
});
test('skip finishes once; cancel never signals successful completion',()=>{
 let calls=0;const a=api().create({onComplete:()=>calls++});a.start({tier:'rare'});a.cancel();assert.equal(a.skip(),false);a.update(9);assert.equal(calls,0);a.start({tier:'legendary'});assert.equal(a.skip(),true);assert.equal(a.skip(),false);assert.equal(calls,1);
});
test('paused or invalid elapsed time cannot advance or complete animation',()=>{
 const a=api().create();a.start({tier:'common'});for(const dt of [0,-1,NaN,Infinity])a.update(dt);assert.equal(a.state().elapsed,0);assert.equal(a.state().active,true);
});
test('reduced motion has short completion; unknown tier cannot silently use another egg',()=>{
 const a=api().create();assert.throws(()=>a.start({tier:'unknown'}),/Unknown/);a.start({tier:'epic',reducedMotion:true});a.update(.3);assert.equal(a.state().active,true);a.update(.2);assert.equal(a.state().phase,'complete');
});
