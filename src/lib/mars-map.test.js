import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../components/mars/mars-surface-map.tsx',import.meta.url),'utf8');
const fragment = source.slice(source.indexOf('export function zoomView'), source.indexOf('function project'));
const compiled = new Bun.Transpiler({loader:'tsx'}).transformSync(fragment).replace('export function','function');
const zoom = new Function(`${compiled}; return zoomView`)();
test('button zoom keeps center point anchored inside fixed 800x400 frame',()=>{
 expect(zoom({scale:1,tx:0,ty:0},1.25,400,200,800,400)).toEqual({scale:1.25,tx:-100,ty:-50});
});
test('wheel zoom preserves cursor content coordinates',()=>{
 const before={scale:2,tx:-200,ty:-100};const after=zoom(before,1.5,300,150,800,400);
 expect((300-after.tx)/after.scale).toBe((300-before.tx)/before.scale);
 expect((150-after.ty)/after.scale).toBe((150-before.ty)/before.scale);
});
test('zoom clamps to 100 through 1200 percent and never leaves empty margins',()=>{
 expect(zoom({scale:1,tx:0,ty:0},0.1,400,200,800,400)).toEqual({scale:1,tx:0,ty:0});
 expect(zoom({scale:1,tx:0,ty:0},100,400,200,800,400).scale).toBe(12);
});
