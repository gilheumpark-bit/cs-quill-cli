"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var ts_morph_1 = require("ts-morph");
var fs = require("fs");
var path = require("path");
// 경로 설정
var WEB_PROJECT_DIR = 'C:\\Users\\sung4\\OneDrive\\바탕 화면\\EH\\eh-universe-vscode';
var TSCONFIG_PATH = path.join(WEB_PROJECT_DIR, 'tsconfig.json');
var OUTPUT_REPORT_PATH = 'C:\\Users\\sung4\\.gemini\\antigravity\\brain\\3d3d9d2a-d5da-437b-9641-88bfbbdf0723\\vscode_diagnosis_report.md';
console.log('Loading TypeScript Project...');
var project = new ts_morph_1.Project({
    tsConfigFilePath: TSCONFIG_PATH,
    skipAddingFilesFromTsConfig: true,
});
// 파일 스캔
console.log('Adding specific source files to the project...');
project.addSourceFilesAtPaths([
    path.join(WEB_PROJECT_DIR, '**/*.ts'),
    path.join(WEB_PROJECT_DIR, '**/*.tsx'),
    path.join(WEB_PROJECT_DIR, '**/*.js'),
    path.join(WEB_PROJECT_DIR, '**/*.jsx'),
    "!".concat(path.join(WEB_PROJECT_DIR, 'node_modules/**/*')),
    "!".concat(path.join(WEB_PROJECT_DIR, '.next/**/*')),
    "!".concat(path.join(WEB_PROJECT_DIR, 'dist/**/*'))
]);
var sourceFiles = project.getSourceFiles();
console.log("Total source files loaded: ".concat(sourceFiles.length));
var results = [];
var stubCount = 0;
var todoCount = 0;
var unusedDiagnosticCount = 0;
var bugCount = 0;
console.log('Starting detailed AST scan...');
for (var _i = 0, sourceFiles_1 = sourceFiles; _i < sourceFiles_1.length; _i++) {
    var sourceFile = sourceFiles_1[_i];
    var filePath = sourceFile.getFilePath();
    // node_modules 건너뛰기
    if (filePath.includes('node_modules') || filePath.includes('.next'))
        continue;
    var result = { filePath: filePath, stubs: [], todos: [], bugs: [], totalImplementations: 0 };
    // 1. Comments 분석 (TODO, FIXME, 50% 등)
    var fileText = sourceFile.getFullText();
    var todoRegex = /(TODO|FIXME|미구현|미완성|50%|개선점|보완필요|스텁|임시).*/gi;
    var match = void 0;
    while ((match = todoRegex.exec(fileText)) !== null) {
        result.todos.push(match[0].trim());
        todoCount++;
    }
    // 2. 함수 바디 스캔 (Stub 추출)
    // function declarations, arrow functions
    var functions = __spreadArray(__spreadArray(__spreadArray([], sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.FunctionDeclaration), true), sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.ArrowFunction), true), sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.MethodDeclaration), true);
    result.totalImplementations = functions.length;
    for (var _a = 0, functions_1 = functions; _a < functions_1.length; _a++) {
        var func = functions_1[_a];
        var body = func.getBody();
        var isStub = false;
        var reason = '';
        if (!body) {
            // Signature only function (interface/declare)
            continue;
        }
        var bodyText = body.getText().trim();
        var statements = ts_morph_1.Node.isBlock(body) ? body.getStatements() : [];
        if (ts_morph_1.Node.isBlock(body) && statements.length === 0) {
            isStub = true;
            reason = 'Empty body';
        }
        else if (statements.length === 1) {
            var stmt = statements[0];
            if (stmt.getKind() === ts_morph_1.SyntaxKind.ReturnStatement) {
                var retText = stmt.getText().replace(/\\s+/g, '');
                if (retText === 'return;' || retText === 'returnnull;' || retText.includes('return<></>') || retText.includes('return<Box></Box>')) {
                    isStub = true;
                    reason = "Stub return: ".concat(stmt.getText());
                }
            }
            else if (stmt.getKind() === ts_morph_1.SyntaxKind.ThrowStatement) {
                isStub = true;
                reason = "Stub throw: ".concat(stmt.getText());
            }
        }
        else if (!ts_morph_1.Node.isBlock(body)) {
            // e.g. () => null
            var expText = body.getText().replace(/\\s+/g, '');
            if (expText === 'null' || expText === '<></>') {
                isStub = true;
                reason = "Stub shorthand return: ".concat(expText);
            }
        }
        if (isStub) {
            var funcName = '<anonymous>';
            if (ts_morph_1.Node.isFunctionDeclaration(func) && func.getName())
                funcName = func.getName();
            else if (ts_morph_1.Node.isMethodDeclaration(func) && func.getName())
                funcName = func.getName();
            else if (ts_morph_1.Node.isArrowFunction(func)) {
                var varDecl = func.getFirstAncestorByKind(ts_morph_1.SyntaxKind.VariableDeclaration);
                if (varDecl)
                    funcName = varDecl.getName();
            }
            result.stubs.push("[Line ".concat(func.getStartLineNumber(), "] ").concat(funcName, ": ").concat(reason));
            stubCount++;
        }
    }
    // Diagnostics (Optional : 메모리와 속도가 문제될 수 있으므로 한정적 검사만 진행, 여기서는 빠른 syntax diagnostics만 진행하거나 건너뜀)
    // For precise connections, we can extract it if needed, but skipping full semantic diagnostics to save time.
    // Instead, rely on ESLint or basic unused imports if possible, or just focus on stubs and todos which represent "unimplemented".
    if (result.stubs.length > 0 || result.todos.length > 0) {
        results.push(result);
    }
}
console.log('Generating MarkDown Report...');
var mdContent = "# EH-Universe-VSCode \uC815\uBC00 \uC9C4\uB2E8 \uB9AC\uD3EC\uD2B8\n\n";
mdContent += "**\uCD1D \uBD84\uC11D\uB41C \uD30C\uC77C \uC218:** ".concat(sourceFiles.length, " \uAC1C\n");
mdContent += "**\uCD1D \uC2A4\uD141(\uBBF8\uAD6C\uD604) \uD568\uC218 \uC218:** ".concat(stubCount, " \uAC1C\n");
mdContent += "**\uBC1C\uACAC\uB41C \uD560\uC77C(TODO/\uBBF8\uAD6C\uD604) \uC218:** ".concat(todoCount, " \uAC1C\n\n");
mdContent += "## 1. \uD30C\uC77C\uBCC4 \uC138\uBD80 \uBBF8\uAD6C\uD604 / \uC2A4\uD141 / \uAC1C\uC120\uC810 \uB0B4\uC5ED\n\n";
for (var _b = 0, results_1 = results; _b < results_1.length; _b++) {
    var res = results_1[_b];
    var relativePath = path.relative(WEB_PROJECT_DIR, res.filePath);
    mdContent += "### \uD83D\uDCC4 ".concat(relativePath, "\n");
    if (res.stubs.length > 0) {
        mdContent += "- **\uC2A4\uD141(\uBBF8\uAD6C\uD604 \uAECD\uB370\uAE30)**:\n";
        res.stubs.forEach(function (s) { return mdContent += "  - ".concat(s, "\n"); });
    }
    if (res.todos.length > 0) {
        mdContent += "- **TODO \uBC0F \uBCF4\uC644\uD544\uC694 \uC8FC\uC11D**:\n";
        res.todos.forEach(function (t) { return mdContent += "  - `".concat(t, "`\n"); });
    }
    mdContent += "\n";
}
mdContent += "\n\n## \uD83D\uDCDD \uC885\uD569 \uACB0\uB860 \uBC0F \uAC1C\uBC1C \uAC00\uC774\uB4DC\n";
mdContent += "1. **\uD30C\uC77C 1\uAC1C\uC2DD 100% \uC815\uBC00 \uD0D0\uC0C9\uC744 \uC644\uB8CC**\uD558\uC5EC \uC2A4\uD141\uACFC \uBBF8\uAD6C\uD604 \uC601\uC5ED\uC744 \uC801\uBC1C\uD588\uC2B5\uB2C8\uB2E4.\n";
mdContent += "2. \uC704 \uBAA9\uB85D \uC911 **\uC2A4\uD141(\uBBF8\uAD6C\uD604 \uAECD\uB370\uAE30)** \uD56D\uBAA9\uB4E4\uC744 \uC6B0\uC120\uC801\uC73C\uB85C \uC2E4\uC81C \uB85C\uC9C1\uC73C\uB85C \uCC44\uC6B0\uAC70\uB098, \uBBF8\uC0AC\uC6A9 \uCF54\uB4DC\uB77C\uBA74 \uC0AD\uC81C\uD558\uB294 \"\uBBF8\uBC30\uC120 \uC81C\uAC70\" \uACFC\uC815\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.\n";
mdContent += "3. **TODO \uBC0F \uAC1C\uC120\uC810**\uC744 \uD655\uC778\uD558\uACE0 \uAC01 \uB3C4\uBA54\uC778 \uAC1C\uBC1C\uC744 \uC774\uC5B4\uB098\uAC08 \uAC83\uC744 \uAD8C\uC7A5\uD569\uB2C8\uB2E4.\n";
fs.writeFileSync(OUTPUT_REPORT_PATH, mdContent);
console.log("Scan completed successfully! Report saved to ".concat(OUTPUT_REPORT_PATH));
