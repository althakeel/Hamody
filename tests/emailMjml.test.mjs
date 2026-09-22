import test from 'node:test';
import assert from 'node:assert/strict';
import { extractMjmlDocument, getMjmlStarter, isMjmlMarkup } from '../lib/emailMjmlDetect.js';
import { compileEmailBlocksMjml, compileMjmlToHtml } from '../lib/emailMjml.js';

test('detects MJML markup and ignores plain HTML', () => {
  assert.equal(isMjmlMarkup('<mjml><mj-body></mj-body></mjml>'), true);
  assert.equal(isMjmlMarkup('<table><tr><td>Hello</td></tr></table>'), false);
  assert.equal(isMjmlMarkup(getMjmlStarter()), true);
});

test('compiles MJML to a full HTML email', async () => {
  const compiled = await compileMjmlToHtml(getMjmlStarter());
  assert.equal(compiled.mjml, true);
  assert.match(compiled.html, /<!doctype html/i);
  assert.match(compiled.html, /Shop now/i);
});

test('compiles MJML blocks before send and leaves HTML blocks unchanged', async () => {
  const { blocks, errors } = await compileEmailBlocksMjml([
    { id: 'html-1', type: 'html', html: getMjmlStarter() },
    { id: 'html-2', type: 'html', html: '<p>Plain</p>' },
  ]);
  assert.equal(errors.length, 0);
  assert.match(blocks[0].html, /<!doctype html/i);
  assert.equal(blocks[1].html, '<p>Plain</p>');
});
