import {
  ComponentType,
  ModalBuilder as DiscordModalBuilder,
  TextInputStyle,
  type Attachment,
  type ModalComponentData,
  type ModalSubmitInteraction,
  type ReadonlyCollection,
  type Snowflake,
} from 'discord.js';
import { FieldStyle } from '../types.js';
import type { PermissionConfig } from '../types.js';
import type { ModalChoiceOption, ModalDescriptor, ModalFieldDescriptor } from '../descriptors.js';
import { buildCustomId } from '../customId/index.js';

export type ModalFieldExecuteFn<TParams, TFields> = (
  interaction: ModalSubmitInteraction,
  args: TParams,
  fields: TFields,
) => Promise<void>;

interface FieldOptions {
  style?: FieldStyle;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  label?: string;
  description?: string;
  value?: string;
}

type ResolvedField<O extends FieldOptions | undefined> = O extends { required: true }
  ? string
  : string | undefined;

interface ModalSelectOptions {
  label?: string;
  description?: string;
  required?: boolean;
  minValues?: number;
  maxValues?: number;
  placeholder?: string;
}

interface ModalStringSelectOptions extends ModalSelectOptions {
  options: ModalChoiceOption[];
}
interface ModalRadioOptions extends ModalSelectOptions {
  options: ModalChoiceOption[];
}
interface ModalFileOptions {
  label?: string;
  description?: string;
  required?: boolean;
  minValues?: number;
  maxValues?: number;
}

export interface ModalBuilder<
  TParams extends Record<string, string> = Record<string, string>,
  TFields extends Record<string, unknown> = Record<string, unknown>,
> {
  setTitle(title: string): ModalBuilder<TParams, TFields>;
  addField<K extends string, O extends FieldOptions | undefined>(
    name: K,
    opts?: O,
  ): ModalBuilder<TParams, TFields & { [P in K]: ResolvedField<O> }>;
  addTextDisplay(content: string): ModalBuilder<TParams, TFields>;
  addStringSelect<K extends string, O extends ModalStringSelectOptions>(
    name: K,
    opts: O,
  ): ModalBuilder<TParams, TFields & { [P in K]: readonly string[] }>;
  addRadioGroup<K extends string, O extends ModalRadioOptions>(
    name: K,
    opts: O,
  ): ModalBuilder<TParams, TFields & { [P in K]: string | null }>;
  addImageUpload<K extends string, O extends ModalFileOptions | undefined>(
    name: K,
    opts?: O,
  ): ModalBuilder<
    TParams,
    TFields & { [P in K]: ReadonlyCollection<Snowflake, Attachment> | null }
  >;
  addParam<K extends string>(name: K): ModalBuilder<TParams & { [P in K]: string }, TFields>;
  setPermissions(perms: PermissionConfig): ModalBuilder<TParams, TFields>;
  setExecute(fn: ModalFieldExecuteFn<TParams, TFields>): ModalBuilder<TParams, TFields>;
  /** Builds a discord.js ModalBuilder ready to show via `interaction.showModal`. */
  create(customId?: string): DiscordModalBuilder;
  build(): ModalDescriptor<TParams, TFields>;
}

interface ModalBuilderState {
  customId: string;
  title?: string;
  fields: ModalFieldDescriptor[];
  params: string[];
  permissions?: PermissionConfig;
  execute?: ModalFieldExecuteFn<Record<string, string>, Record<string, unknown>>;
}

function mapStyle(style?: FieldStyle): TextInputStyle {
  return style === FieldStyle.Paragraph ? TextInputStyle.Paragraph : TextInputStyle.Short;
}

function toOptionData(option: ModalChoiceOption) {
  return {
    label: option.label,
    value: option.value,
    description: option.description,
    default: option.default,
  };
}

/** Maps declared fields to discord.js v2 modal component data. */
export function buildModalComponents(
  fields: ModalFieldDescriptor[],
): ModalComponentData['components'] {
  return fields.map((field): ModalComponentData['components'][number] => {
    if (field.kind === 'textDisplay') {
      return { type: ComponentType.TextDisplay, content: field.content ?? '' };
    }

    const label = field.label ?? field.name;
    const description = field.description;
    const required = field.required ?? true;

    if (field.kind === 'field') {
      const inner = {
        type: ComponentType.TextInput,
        customId: field.name,
        style: mapStyle(field.style),
        label,
        required,
        minLength: field.minLength,
        maxLength: field.maxLength,
        placeholder: field.placeholder,
        value: field.value,
      };
      const data: Record<string, unknown> = { type: ComponentType.Label, label, component: inner };
      if (description) data.description = description;
      return data as unknown as ModalComponentData['components'][number];
    }

    if (field.kind === 'stringSelect') {
      const inner = {
        type: ComponentType.StringSelect,
        customId: field.name,
        options: (field.options ?? []).map(toOptionData),
        required: required ? true : undefined,
        placeholder: field.placeholder,
        minValues: field.minValues,
        maxValues: field.maxValues,
      };
      const data: Record<string, unknown> = { type: ComponentType.Label, label, component: inner };
      if (description) data.description = description;
      return data as unknown as ModalComponentData['components'][number];
    }

    if (field.kind === 'radioGroup') {
      const inner = {
        type: ComponentType.RadioGroup,
        customId: field.name,
        options: (field.options ?? []).map(toOptionData),
        required,
      };
      const data: Record<string, unknown> = { type: ComponentType.Label, label, component: inner };
      if (description) data.description = description;
      return data as unknown as ModalComponentData['components'][number];
    }

    // imageUpload (FileUpload)
    const inner = {
      type: ComponentType.FileUpload,
      customId: field.name,
      required,
      minValues: field.minValues,
      maxValues: field.maxValues,
    };
    const data: Record<string, unknown> = {
      type: ComponentType.Label,
      label: field.label ?? 'Upload image',
      component: inner,
    };
    if (description) data.description = description;
    return data as unknown as ModalComponentData['components'][number];
  });
}

function makeModalBuilder<
  TParams extends Record<string, string>,
  TFields extends Record<string, unknown>,
>(state: ModalBuilderState): ModalBuilder<TParams, TFields> {
  function addField(field: ModalFieldDescriptor): ModalBuilder<TParams, TFields> {
    return makeModalBuilder<TParams, TFields>({ ...state, fields: [...state.fields, field] });
  }

  return {
    setTitle(title) {
      return makeModalBuilder<TParams, TFields>({ ...state, title });
    },
    addField<K extends string, O extends FieldOptions | undefined>(
      name: K,
      opts?: O,
    ): ModalBuilder<TParams, TFields & { [P in K]: ResolvedField<O> }> {
      return makeModalBuilder<TParams, TFields & { [P in K]: ResolvedField<O> }>({
        ...state,
        fields: [
          ...state.fields,
          {
            name,
            kind: 'field',
            style: opts?.style,
            required: opts?.required ?? true,
            minLength: opts?.minLength,
            maxLength: opts?.maxLength,
            placeholder: opts?.placeholder,
            label: opts?.label ?? name,
            description: opts?.description,
            value: opts?.value,
          },
        ],
      });
    },
    addTextDisplay(content) {
      return addField({
        name: `textDisplay${state.fields.length}`,
        kind: 'textDisplay',
        content,
        required: false,
      });
    },
    addStringSelect<K extends string, O extends ModalStringSelectOptions>(
      name: K,
      opts: O,
    ): ModalBuilder<TParams, TFields & { [P in K]: readonly string[] }> {
      return makeModalBuilder<TParams, TFields & { [P in K]: readonly string[] }>({
        ...state,
        fields: [
          ...state.fields,
          {
            name,
            kind: 'stringSelect',
            label: opts.label ?? name,
            description: opts.description,
            required: opts.required ?? true,
            placeholder: opts.placeholder,
            minValues: opts.minValues,
            maxValues: opts.maxValues,
            options: opts.options,
          },
        ],
      });
    },
    addRadioGroup<K extends string, O extends ModalRadioOptions>(
      name: K,
      opts: O,
    ): ModalBuilder<TParams, TFields & { [P in K]: string | null }> {
      return makeModalBuilder<TParams, TFields & { [P in K]: string | null }>({
        ...state,
        fields: [
          ...state.fields,
          {
            name,
            kind: 'radioGroup',
            label: opts.label ?? name,
            description: opts.description,
            required: opts.required ?? true,
            options: opts.options,
          },
        ],
      });
    },
    addImageUpload<K extends string, O extends ModalFileOptions | undefined>(
      name: K,
      opts?: O,
    ): ModalBuilder<
      TParams,
      TFields & { [P in K]: ReadonlyCollection<Snowflake, Attachment> | null }
    > {
      return makeModalBuilder<
        TParams,
        TFields & { [P in K]: ReadonlyCollection<Snowflake, Attachment> | null }
      >({
        ...state,
        fields: [
          ...state.fields,
          {
            name,
            kind: 'imageUpload',
            label: opts?.label ?? 'Upload image',
            description: opts?.description,
            required: opts?.required ?? true,
            minValues: opts?.minValues,
            maxValues: opts?.maxValues,
          },
        ],
      });
    },
    addParam<K extends string>(name: K): ModalBuilder<TParams & { [P in K]: string }, TFields> {
      return makeModalBuilder<TParams & { [P in K]: string }, TFields>({
        ...state,
        params: [...state.params, name],
      });
    },
    setPermissions(perms) {
      return makeModalBuilder<TParams, TFields>({ ...state, permissions: perms });
    },
    setExecute(fn) {
      return makeModalBuilder<TParams, TFields>({
        ...state,
        execute: fn as ModalFieldExecuteFn<Record<string, string>, Record<string, unknown>>,
      });
    },
    create(customId?: string): DiscordModalBuilder {
      const id = customId ?? buildCustomId(state.customId);
      return new DiscordModalBuilder({
        customId: id,
        title: state.title ?? state.customId,
        components: buildModalComponents(state.fields),
      } as ModalComponentData);
    },
    build(): ModalDescriptor<TParams, TFields> {
      return {
        customId: state.customId,
        params: state.params,
        title: state.title,
        fields: state.fields,
        permissions: state.permissions,
        execute: state.execute as ModalDescriptor<TParams, TFields>['execute'],
      };
    },
  };
}

/**
 * Declares a Components v2 modal with text inputs, text displays, string
 * selects, radio groups, and image uploads. `.create()` builds the discord.js
 * ModalBuilder to show; `.setExecute(fn)` receives the submitted `fields`.
 *
 * @example
 * export default createModal('feedback')
 *   .setTitle('Feedback')
 *   .addField('message', { style: FieldStyle.Paragraph, required: true })
 *   .setExecute(async (interaction, args, fields) => {
 *     await interaction.reply(`Thanks: ${fields.message}`);
 *   });
 */
export function createModal(
  customId: string,
): ModalBuilder<Record<never, never>, Record<never, never>> {
  return makeModalBuilder<Record<never, never>, Record<never, never>>({
    customId,
    fields: [],
    params: [],
  });
}
