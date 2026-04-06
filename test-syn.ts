import { Project } from 'ts-morph';
const project = new Project();
const sf = project.createSourceFile('demo.ts', `
function test() {
  const obj = { a: 1;
  const arr = [1, 2;
  const str = "hello
}
`);
console.log(sf.getPreEmitDiagnostics().map(d => ({
  code: d.getCode(),
  msg: d.getMessageText(),
  line: d.getLineNumber()
})));
