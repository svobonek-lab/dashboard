import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const files = [];
function visitDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) visitDirectory(file);
    else if (/\.tsx?$/.test(entry.name)) files.push(file);
  }
}
visitDirectory('src');

const rows = [];
function staticTexts(node) {
  if (!node) return [];
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isJsxText(node)) {
    const value = node.text.replace(/\s+/g, ' ').trim();
    return value ? [value] : [];
  }
  if (ts.isJsxExpression(node)) return staticTexts(node.expression);
  if (ts.isConditionalExpression(node)) return [...staticTexts(node.whenTrue), ...staticTexts(node.whenFalse)];
  if (ts.isParenthesizedExpression(node)) return staticTexts(node.expression);
  if (ts.isJsxElement(node)) return node.children.flatMap(staticTexts);
  if (ts.isJsxFragment(node)) return node.children.flatMap(staticTexts);
  if (ts.isTemplateExpression(node)) return [node.getText().replace(/\s+/g, ' ')];
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) return [...staticTexts(node.left), ...staticTexts(node.right)];
  return [];
}
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  function add(kind, node, text) {
    const { line } = tree.getLineAndCharacterOfPosition(node.getStart(tree));
    rows.push({ kind, file: file.replaceAll('\\', '/'), line: line + 1, text });
  }
  function walk(node) {
    if (ts.isJsxElement(node)) {
      const tag = node.openingElement.tagName.getText(tree);
      if (tag === 'button' || tag === 'Button') {
        const texts = node.children.flatMap(staticTexts);
        add('button', node, [...new Set(texts)].join(' | ') || '[dynamic/icon]');
      }
      const alert = node.openingElement.attributes.properties.some((attribute) =>
        ts.isJsxAttribute(attribute) && attribute.name.text === 'role' &&
        attribute.initializer && ts.isStringLiteral(attribute.initializer) && attribute.initializer.text === 'alert');
      if (alert) {
        const texts = [...new Set(node.children.flatMap(staticTexts))];
        add('error-visible', node, texts.join(' | ') || '[dynamic]');
      }
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(tree);
      if (tag === 'button' || tag === 'Button' || tag === 'input') {
        for (const attr of node.attributes.properties) {
          if (!ts.isJsxAttribute(attr) || !['aria-label', 'title', 'value'].includes(attr.name.text)) continue;
          const texts = staticTexts(attr.initializer);
          for (const text of texts) add('button-attribute', attr, text);
        }
      }
    }
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(tree);
      if (/^(set\w*Error|showToast|toast\.error)$/.test(callee)) {
        for (const text of staticTexts(node.arguments[0])) add('error-candidate', node, text);
      }
      if (/^(setNotice|setSaveState|setState)$/.test(callee) && node.arguments[0] && ts.isObjectLiteralExpression(node.arguments[0])) {
        const properties = node.arguments[0].properties.filter(ts.isPropertyAssignment);
        const kind = properties.find((property) => property.name.getText(tree) === 'kind');
        if (kind && staticTexts(kind.initializer).includes('error')) {
          for (const property of properties.filter((item) => ['text', 'message'].includes(item.name.getText(tree)))) {
            for (const value of staticTexts(property.initializer)) add('error-candidate', node, value);
          }
        }
      }
    }
    if (ts.isNewExpression(node) && node.expression.getText(tree) === 'Error') {
      for (const value of staticTexts(node.arguments?.[0])) add('error-candidate', node, value);
    }
    ts.forEachChild(node, walk);
  }
  walk(tree);
}
for (const row of rows) process.stdout.write(JSON.stringify(row) + '\n');
