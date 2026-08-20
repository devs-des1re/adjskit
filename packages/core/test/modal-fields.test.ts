import { describe, it, expect } from 'vitest';
import { ComponentType } from 'discord.js';
import type { ModalSubmitInteraction } from 'discord.js';
import { extractModalFields } from '../src/index.js';
import type { ModalFieldDescriptor } from '../src/index.js';

const fields: ModalFieldDescriptor[] = [
  { name: 'reason', kind: 'field', required: true },
  { name: 'topic', kind: 'stringSelect', required: true, options: [] },
  { name: 'priority', kind: 'radioGroup', required: true, options: [] },
  { name: 'img', kind: 'imageUpload', required: false },
  { name: 'td', kind: 'textDisplay', content: 'header', required: false },
];

function fakeInteraction(components: unknown[]): ModalSubmitInteraction {
  return { components } as unknown as ModalSubmitInteraction;
}

describe('extractModalFields', () => {
  it('pulls the right value for each field kind from the submission tree', () => {
    const attachments = { id: 'a1' } as unknown;
    const interaction = fakeInteraction([
      {
        type: ComponentType.Label,
        component: { type: ComponentType.TextInput, customId: 'reason', value: 'because' },
      },
      {
        type: ComponentType.Label,
        component: {
          type: ComponentType.StringSelect,
          customId: 'topic',
          values: ['bug', 'feature'],
        },
      },
      {
        type: ComponentType.Label,
        component: { type: ComponentType.RadioGroup, customId: 'priority', value: 'high' },
      },
      {
        type: ComponentType.Label,
        component: { type: ComponentType.FileUpload, customId: 'img', attachments },
      },
    ]);

    const result = extractModalFields(interaction, fields);
    expect(result.reason).toBe('because');
    expect(result.topic).toEqual(['bug', 'feature']);
    expect(result.priority).toBe('high');
    expect(result.img).toBe(attachments);
    expect(result.td).toBeUndefined();
  });

  it('handles a missing radio value as null and a missing select as empty', () => {
    const interaction = fakeInteraction([
      {
        type: ComponentType.Label,
        component: { type: ComponentType.RadioGroup, customId: 'priority', value: null },
      },
    ]);
    const result = extractModalFields(interaction, fields);
    expect(result.priority).toBeNull();
    expect(result.topic).toEqual([]);
  });

  it('handles action-row-wrapped text inputs', () => {
    const interaction = fakeInteraction([
      {
        type: ComponentType.ActionRow,
        components: [{ type: ComponentType.TextInput, customId: 'reason', value: 'wrapped' }],
      },
    ]);
    const result = extractModalFields(interaction, fields);
    expect(result.reason).toBe('wrapped');
  });
});
