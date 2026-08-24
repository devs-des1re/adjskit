import { toJs, ext } from '../utils.js';
import type { Lang, ScaffoldedFile } from '../types.js';

export type AddKind = 'command' | 'event' | 'button' | 'modal' | 'dropdown';

const KIND_FOLDER: Record<AddKind, string> = {
  command: 'src/commands',
  event: 'src/events',
  button: 'src/buttons',
  modal: 'src/modals',
  dropdown: 'src/dropdowns',
};

function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function kebabCase(name: string): string {
  return name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`).replace(/^-/, '');
}

function stubSource(kind: AddKind, base: string): string {
  switch (kind) {
    case 'command':
      return `import { createCommand, ParamType } from '@adjskit/core';

export default createCommand('${base}')
  .setDescription('Describe ${base}')
  .setType('both')
  .setExecute(async (ctx, ictx, args) => {
    await ctx.reply('Hello!');
  });
`;
    case 'event':
      return `import type { ClientEvents } from 'discord.js';
import { createEvent } from '@adjskit/core';

export default createEvent('${base}' as keyof ClientEvents)
  .setExecute(async (...args) => {
    console.log('${base} fired');
  });
`;
    case 'button':
      return `import { createButton } from '@adjskit/core';

export default createButton('${kebabCase(base)}')
  .addParam('targetId')
  .setExecute(async (interaction, args) => {
    await interaction.reply({ content: 'Clicked!', ephemeral: true });
  });
`;
    case 'modal':
      return `import { createModal, FieldStyle } from '@adjskit/core';

export default createModal('${kebabCase(base)}')
  .setTitle('Example Modal')
  .addField('reason', { style: FieldStyle.Paragraph, required: true })
  .setExecute(async (interaction, args, fields) => {
    await interaction.reply({ content: \`Reason: \${fields.reason}\`, ephemeral: true });
  });
`;
    case 'dropdown':
      return `import { createDropdown, SelectType } from '@adjskit/core';

export default createDropdown('${kebabCase(base)}', { type: SelectType.String })
  .setExecute(async (interaction, args, values) => {
    await interaction.reply({ content: \`Picked: \${values.join(', ')}\`, ephemeral: true });
  });
`;
  }
}

/**
 * Generates a stub file for a new command/event/button/modal/dropdown.
 * `name` supports nested paths like `moderation/ban`. The default export is a
 * builder (no `.build()`); loaders normalize it at runtime.
 */
export function addFile(kind: AddKind, name: string, lang: Lang): ScaffoldedFile {
  const base = basename(name);
  const src = stubSource(kind, base);
  return {
    path: `${KIND_FOLDER[kind]}/${name}${ext(lang)}`,
    content: lang === 'ts' ? src : toJs(src),
  };
}
