import type { components } from '../shared/contracts.js';
import { Fault } from './errors.js';
import { fields } from './definitions.js';
type S = components['schemas'];
/** Formatting is data only: the API never stores/executes editor HTML or CSS expressions. */
export function documentText(document: S['StudentRichDocument']) {
  const render = (node: S['StudentRichNode']): string => {
    if (node.type === 'templateField') {
      const key = node.attrs?.fieldKey;
      if (!key || !Object.hasOwn(fields, key))
        throw new Fault(422, 'TEMPLATE_FIELD_UNKNOWN', '模板中包含未识别的填充字段。', [
          { field: 'document', reason: '请选择编辑器右侧列出的字段。' },
        ]);
      return '{{' + fields[key] + '}}';
    }
    if (node.type === 'text') {
      if (typeof node.text !== 'string' || node.content?.length)
        throw new Fault(422, 'TEMPLATE_INVALID', '模板文字节点无效。');
      return node.text;
    }
    if (node.type === 'hardBreak') return '\n';
    if (node.type === 'horizontalRule') return '\n\n';
    if (node.type === 'image') {
      if (!/^data:image\/(png|jpeg|gif|bmp);base64,/.test(node.attrs?.src ?? ''))
        throw new Fault(422, 'TEMPLATE_INVALID', '模板图片需要使用上传的本地图片。');
      return '';
    }
    if (node.attrs?.fieldKey)
      throw new Fault(422, 'TEMPLATE_INVALID', '填充字段只能用于字段节点。');
    const children = node.content ?? [];
    const inline = ['text', 'templateField', 'hardBreak', 'image'];
    if (
      ['paragraph', 'heading'].includes(node.type) &&
      children.some((child) => !inline.includes(child.type))
    )
      throw new Fault(422, 'TEMPLATE_INVALID', '段落包含不支持的嵌套内容。');
    if (
      (node.type === 'table' && children.some((child) => child.type !== 'tableRow')) ||
      (node.type === 'tableRow' &&
        children.some((child) => !['tableCell', 'tableHeader'].includes(child.type)))
    )
      throw new Fault(422, 'TEMPLATE_INVALID', '表格结构无效。');
    if (
      ['bulletList', 'orderedList'].includes(node.type) &&
      children.some((child) => child.type !== 'listItem')
    )
      throw new Fault(422, 'TEMPLATE_INVALID', '列表结构无效。');
    return children.map(render).join(['paragraph', 'heading'].includes(node.type) ? '' : '\n\n');
  };
  if (
    document.content.some((node) =>
      ['text', 'templateField', 'hardBreak', 'listItem'].includes(node.type),
    )
  )
    throw new Fault(422, 'TEMPLATE_INVALID', '文档正文需要由段落或列表组成。');
  return document.content.map(render).join('\n\n').trim();
}
