import { describe, it, expect } from 'vitest';
import { renderTextLines } from '../../text_block_renderer.ts';

describe('renderTextLines list and comment', () => {
  it('renders "- " lines as lists', () => {
    expect(renderTextLines(['- one', '- two'])).toBe(
'<div class="section-content">\
<ul><li>one</li></ul>\n\
<ul><li>two</li></ul>\n\
</div>');
  });
  it('renders "- " lines accurately', () => {
    expect(renderTextLines([' - one', '- two'])).toBe(
'<div class="section-content">\
 - one\n\
<ul><li>two</li></ul>\n\
</div>');
  });
});

describe('bracket syntax', () => {
  it('renders nested bracket', () => {
    const html = renderTextLines([
      '[r]{[g]{text}}',
      '[o]{1[gra]{2}3}'
    ]);
    expect(html).toBe(
'<div class="section-content">\
<span class="red-text"><span class="green-text">text</span></span>\n\
<span class="orange-text">1<span class="gray-text">2</span>3</span>\
</div>');
  });

  it('renders bracket tags and ignores unsupported style tokens', () => {
    const html = renderTextLines(['[r U _]{text[]123}']);
    expect(html).toBe(
      '<div class="section-content">\
<span class="red-text"><span class="underline-text">text[]123</span></span>\
</div>'
    );
  });

  it('expands complex selectors like b(s r c) and o(θ)', () => {
    const html = renderTextLines(['[b(s r c) o(θ)]{x = r sinθ cosφ}']);
    expect(html).toBe(
      '<div class="section-content">\
x = <span class="blue-text">r</span> <span class="blue-text">s</span>in<span class="orange-text">θ</span> <span class="blue-text">c</span>o<span class="blue-text">s</span>φ\
</div>'
    );
  });

  it('wraps nested bracket content in center style', () => {
    const html = renderTextLines([
      'Center test[C]{MnO[s r]{4}[s o]{2-}  [s]{manganese[s]{acid[s]{root[S]{up[S]{line}}}}}}'
    ]);
    expect(html).toBe(
      '<div class="section-content">\
Center test<span class="center-text">MnO\
<span class="subscript-text"><span class="red-text">4</span></span>\
<span class="subscript-text"><span class="orange-text">2-</span></span>\
  \
<span class="subscript-text">manganese\
<span class="subscript-text">acid\
<span class="subscript-text">root\
<span class="superscript-text">up\
<span class="superscript-text">line</span>\
</span>\
</span>\
</span>\
</span>\
</span>\
</div>'
    );
  });

  it('preserves style order for underline/overline and color combinations', () => {
    const html = renderTextLines(['[U r]{underline then red} [r U]{red then underline}']);
    expect(html).toBe(
      '<div class="section-content">\
<span class="underline-text"><span class="red-text">underline then red</span></span>\
 \
<span class="red-text"><span class="underline-text">red then underline</span></span>\
</div>'
    );
  });

  it('renders nested color and decoration brackets', () => {
    const html = renderTextLines([
      '[b U]{[r]{red text with blue underline}[g O]{[o]{orange text with green overline}}}'
    ]);
    expect(html).toBe(
      '<div class="section-content">\
<span class="blue-text"><span class="underline-text">\
<span class="red-text">red text with blue underline</span>\
<span class="green-text"><span class="overline-text">\
<span class="orange-text">orange text with green overline</span>\
</span></span>\
</span></span>\
</div>'
    );
  });

  it('renders multiple style tokens and keeps literal braces in content', () => {
    const html = renderTextLines(['[b U r O g]{first{blue underline} then{red overline} finally adjust}']);
    expect(html).toBe(
      '<div class="section-content">\
<span class="blue-text"><span class="underline-text"><span class="red-text"><span class="overline-text"><span class="green-text">\
first{blue underline} then{red overline} finally adjust\
</span></span></span></span></span>\
</div>'
    );
  });
  
});
