// Deterministic tests using the EXACT pure geometry factory embedded in the app.
// No fake product accuracy metric; these tests are for editing behavior only.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const src=readFileSync('src/index.template.html','utf8');
const begin=src.indexOf('// LINE_INTERACTION:BEGIN');
const end=src.indexOf('// LINE_INTERACTION:END');
assert(begin>=0&&end>begin,'Live line interaction markers missing');
const factory=vm.runInNewContext('(()=>{'+src.slice(begin+'// LINE_INTERACTION:BEGIN'.length,end)+
  ';return createLineInteraction;})()');
const api=factory();
let tests=0;
function test(name,run){run();tests++;console.log('[line] PASS '+name);}
const endpoints=[{x:100,y:150},{x:400,y:150}];
const coords=(v)=>[v[0].x,v[0].y,v[1].x,v[1].y];
const round=(value)=>Math.round(value*1e6)/1e6;
const rounded=(points)=>Array.from(coords(points),round);
test('both endpoints take priority over whole-line drag',()=>{
 assert.equal(api.hitTest({x:110,y:150},endpoints,'touch')?.kind,'endpoint');
 assert.equal(api.hitTest({x:395,y:149},endpoints,'mouse')?.index,1);
});
test('whole horizontal line is draggable between endpoint zones',()=>{
 const point=api.hitTest({x:245,y:150},endpoints,'mouse');
 assert.equal(point?.kind,'segment');
});
test('near-line touch target is more forgiving than mouse hover',()=>{
 assert.equal(api.hitTest({x:250,y:171},endpoints,'touch')?.kind,'segment');
 assert.equal(api.hitTest({x:250,y:171},endpoints,'mouse'),null);
});
test('empty canvas area and segment extension do not hijack scrolling',()=>{
 assert.equal(api.hitTest({x:250,y:250},endpoints,'touch'),null);
 assert.equal(api.hitTest({x:480,y:150},endpoints,'mouse'),null);
});
test('translating preserves segment angle, length and endpoint separation',()=>{
 const line=[{x:.12,y:.48},{x:.88,y:.55}];
 const moved=api.translate(line,{x:.055,y:-.14});
 assert.deepEqual(rounded(moved),[.175,.34,.935,.41]);
 assert.deepEqual(rounded(line),[.12,.48,.88,.55],'Must not mutate source points');
 assert.equal(round(Math.hypot(moved[1].x-moved[0].x,moved[1].y-moved[0].y)),
   round(Math.hypot(line[1].x-line[0].x,line[1].y-line[0].y)));
});
test('dragging far beyond the edge clamps BOTH endpoints rigidly',()=>{
 const line=[{x:.12,y:.52},{x:.88,y:.52}];
 assert.deepEqual(rounded(api.translate(line,{x:3,y:-4})),[.21,.03,.97,.03]);
 assert.deepEqual(rounded(api.translate(line,{x:-3,y:4})),[.03,.97,.79,.97]);
});
test('vertical line can be translated without changing its angle',()=>{
 const line=[{x:.5,y:.11},{x:.5,y:.88}];
 assert.deepEqual(rounded(api.translate(line,{x:.32,y:.31})),[.82,.2,.82,.97]);
});
test('diagonal near the endpoint still picks the actual handle',()=>{
 const line=[{x:120,y:200},{x:390,y:450}];
 assert.equal(api.hitTest({x:121,y:205},line,'touch')?.index,0);
 const middle={x:255,y:325};
 assert.equal(api.hitTest(middle,line,'mouse')?.kind,'segment');
});
test('degenerate geometry never produces a false segment move',()=>{
 assert.equal(api.hitTest({x:300,y:300},[{x:100,y:100},{x:100,y:100}],'touch'),null);
});
test('invalid translation is clamped to zero',()=>{
 const line=[{x:.1,y:.2},{x:.8,y:.7}];
 assert.deepEqual(rounded(api.translate(line,{x:NaN,y:NaN})),[.1,.2,.8,.7]);
});
console.log('[line] '+tests+' geometry and interaction regressions passed.');
