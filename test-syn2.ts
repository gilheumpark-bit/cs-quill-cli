import { Project } from 'ts-morph';
const project = new Project();
const sf = project.createSourceFile('demo.ts', `
function a() {
function b( {
const c = [1, 2;
const d = { a: 1 ];
const class = 1;
const e = \`test
const f = /test/gg;
import g from module;
`);
console.log(sf.getPreEmitDiagnostics().map(d => ({
  code: d.getCode(),
  msg: d.getMessageText(),
  line: d.getLineNumber()
})));
