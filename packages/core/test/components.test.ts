import { describe, it, expect } from 'vitest';
import { ComponentType, TextInputStyle } from 'discord.js';
import {
  createButton,
  createDropdown,
  createModal,
  SelectType,
  FieldStyle,
  buildModalComponents,
  type ModalFieldDescriptor,
} from '../src/index.js';

describe('createButton', () => {
  it('builds a button descriptor with declared params', () => {
    const desc = createButton('confirm_ban')
      .addParam('targetId')
      .addParam('reason')
      .setPermissions({ ownerOnly: true })
      .setExecute(async (interaction, args) => {
        void interaction;
        void args;
      })
      .build();

    expect(desc.customId).toBe('confirm_ban');
    expect(desc.params).toEqual(['targetId', 'reason']);
    expect(desc.permissions?.ownerOnly).toBe(true);
    expect(typeof desc.execute).toBe('function');
  });
});

describe('createDropdown', () => {
  it('builds a dropdown descriptor with the select type and params', () => {
    const desc = createDropdown('roleMenu', { type: SelectType.Role })
      .addParam('guildId')
      .setExecute(async (interaction, args, values) => {
        void interaction;
        void args;
        void values;
      })
      .build();

    expect(desc.customId).toBe('roleMenu');
    expect(desc.selectType).toBe(SelectType.Role);
    expect(desc.params).toEqual(['guildId']);
  });
});

describe('createModal', () => {
  it('builds a modal descriptor with all field kinds', () => {
    const desc = createModal('feedback')
      .setTitle('Feedback Form')
      .addField('message', { style: FieldStyle.Paragraph, required: true })
      .addTextDisplay('Please describe your issue.')
      .addStringSelect('topic', {
        options: [
          { label: 'Bug', value: 'bug' },
          { label: 'Feature', value: 'feature' },
        ],
      })
      .addRadioGroup('priority', {
        options: [
          { label: 'Low', value: 'low' },
          { label: 'High', value: 'high' },
        ],
      })
      .addImageUpload('screenshot')
      .setExecute(async (interaction, args, fields) => {
        void interaction;
        void args;
        void fields;
      })
      .build();

    expect(desc.customId).toBe('feedback');
    expect(desc.title).toBe('Feedback Form');
    expect(desc.fields).toHaveLength(5);
    expect(desc.fields.map((f) => f.kind)).toEqual([
      'field',
      'textDisplay',
      'stringSelect',
      'radioGroup',
      'imageUpload',
    ]);
  });

  it('create() builds a discord.js ModalBuilder with the v2 component data', () => {
    const modal = createModal('feedback')
      .setTitle('Feedback')
      .addField('message', { required: true })
      .addTextDisplay('Header text')
      .addStringSelect('topic', { options: [{ label: 'Bug', value: 'bug' }] })
      .addRadioGroup('priority', {
        options: [
          { label: 'Low', value: 'low' },
          { label: 'High', value: 'high' },
        ],
      })
      .addImageUpload('screenshot');

    const builder = modal.create();
    const data = builder.toJSON();
    expect(data.title).toBe('Feedback');
    expect(data.components).toHaveLength(5);
  });
});

describe('buildModalComponents', () => {
  it('maps a text input to a Label wrapping a TextInput', () => {
    const components = buildModalComponents([
      { name: 'reason', kind: 'field', label: 'Reason', required: true, style: FieldStyle.Short },
    ] as ModalFieldDescriptor[]);
    const component = components[0] as {
      type: number;
      label: string;
      component: { type: number; customId: string; style: number; label?: string };
    };
    expect(component.type).toBe(ComponentType.Label);
    expect(component.label).toBe('Reason');
    expect(component.component.type).toBe(ComponentType.TextInput);
    expect(component.component.customId).toBe('reason');
    expect(component.component.style).toBe(TextInputStyle.Short);
    // v2: a TextInput nested in a Label component must not carry its own label
    expect(component.component.label).toBeUndefined();
  });

  it('maps a text display to a standalone TextDisplay', () => {
    const components = buildModalComponents([
      { name: 'td0', kind: 'textDisplay', content: 'hello', required: false },
    ] as ModalFieldDescriptor[]);
    const component = components[0] as { type: number; content: string };
    expect(component.type).toBe(ComponentType.TextDisplay);
    expect(component.content).toBe('hello');
  });

  it('maps a radio group and image upload correctly', () => {
    const components = buildModalComponents([
      {
        name: 'priority',
        kind: 'radioGroup',
        label: 'Priority',
        required: true,
        options: [{ label: 'High', value: 'high' }],
      },
      { name: 'img', kind: 'imageUpload', label: 'Upload', required: false },
    ] as ModalFieldDescriptor[]);
    const radio = components[0] as {
      type: number;
      component: { type: number; options: unknown[] };
    };
    const upload = components[1] as { type: number; component: { type: number } };
    expect(radio.type).toBe(ComponentType.Label);
    expect(radio.component.type).toBe(ComponentType.RadioGroup);
    expect(radio.component.options).toHaveLength(1);
    expect(upload.component.type).toBe(ComponentType.FileUpload);
  });
});
