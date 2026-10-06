import { MultiSelectPrompt, SelectPrompt, isCancel } from '@clack/core';
import pc from 'picocolors';

export interface PositionalOption<T = string> {
  value: T;
  label: string;
  hint?: string;
  badge?: string;
  disabled?: boolean;
  details?: string[];
}

export interface PositionalMultiSelectConfig<T = string> {
  title?: string;
  message: string;
  options: PositionalOption<T>[];
  initialValues?: T[];
  required?: boolean;
}

export interface PositionalSelectConfig<T = string> {
  title?: string;
  message: string;
  options: PositionalOption<T>[];
  initialValue?: T;
}

/**
 * Enhanced MultiSelect with crystal-clear positional indicator,
 * high-contrast cursor row, explicit [X]/[ ] states, and live details panel.
 */
export async function positionalMultiSelect<T = string>(
  config: PositionalMultiSelectConfig<T>
): Promise<T[] | symbol> {
  const prompt = new MultiSelectPrompt({
    options: config.options.map((opt) => ({
      value: opt.value,
      label: opt.label,
      hint: opt.hint,
      disabled: opt.disabled
    })),
    initialValues: config.initialValues ?? [],
    required: config.required ?? true,
    validate(val) {
      if (config.required && (!val || val.length === 0)) {
        return 'Debes seleccionar al menos una opcion con [ESPACIO].';
      }
    },
    render() {
      const total = this.options.length;
      const currentPos = this.cursor + 1;
      const activeOption = config.options[this.cursor];
      const selectedValues = this.value ?? [];

      // 1. Submit state: Clean summary
      if (this.state === 'submit') {
        const selectedLabels = config.options
          .filter((opt) => selectedValues.includes(opt.value))
          .map((opt) => pc.cyan(opt.label))
          .join(', ');
        return `\n${pc.green('[OK]')} ${pc.bold(config.message)}\n` +
          `     ${pc.dim('Seleccionados:')} ${selectedLabels || pc.dim('(ninguno)')}\n\n`;
      }

      // 2. Cancel state
      if (this.state === 'cancel') {
        return `\n${pc.red('[X]')} ${pc.dim(`${config.message}: Cancelado por el usuario.`)}\n\n`;
      }

      // 3. Active / Initial / Error state
      const lines: string[] = [];

      // Top Breadcrumb & Status Header
      const headerTitle = config.title ?? 'SELECCION DE ROLES Y SUBAGENTES';
      const countSelected = selectedValues.length;
      lines.push(
        `${pc.bgCyan(pc.black(` ${headerTitle} `))} ` +
        `${pc.bold(pc.cyan(`[POSICION ${currentPos} DE ${total}]`))} ` +
        `${pc.dim(`• Marcados: ${countSelected}/${total}`)}`
      );
      lines.push(`${pc.bold(config.message)}`);
      lines.push('');

      // Options List with explicit cursor highlighting
      config.options.forEach((opt, idx) => {
        const isFocused = idx === this.cursor;
        const isSelected = selectedValues.includes(opt.value);

        if (isFocused) {
          // Focused row: High contrast cyan badge & bold styling
          const cursorBadge = pc.bgCyan(pc.black(` ▶ [${idx + 1}/${total}] `));
          const stateBadge = isSelected
            ? pc.bold(pc.green('[X] SELECCIONADO'))
            : pc.bold(pc.yellow('[ ] DESMARCADO  '));
          const labelText = pc.bold(pc.white(opt.label));
          const hintText = opt.hint ? pc.dim(` — ${opt.hint}`) : '';
          lines.push(`${cursorBadge} ${stateBadge} ${labelText}${hintText}`);
        } else {
          // Unfocused row: Subdued gray numbering and state
          const cursorBadge = pc.dim(`   [${idx + 1}/${total}] `);
          const stateBadge = isSelected
            ? pc.green('[X] marcado     ')
            : pc.dim('[ ]             ');
          const labelText = isSelected ? pc.white(opt.label) : pc.dim(opt.label);
          lines.push(`${cursorBadge} ${stateBadge} ${labelText}`);
        }
      });

      lines.push('');

      // Live Inspector Panel for Hovered Role/Option
      if (activeOption) {
        const isHoveredSelected = selectedValues.includes(activeOption.value);
        lines.push(
          pc.cyan('┌─') +
          pc.bold(pc.cyan(` DETALLES EN POSICION [${currentPos} DE ${total}]: `)) +
          pc.bold(pc.white(activeOption.label)) +
          pc.cyan(' ─'.repeat(Math.max(2, 20 - Math.min(15, activeOption.label.length))))
        );

        lines.push(
          `${pc.cyan('│')} ${pc.bold('Estado:')} ${
            isHoveredSelected
              ? pc.bold(pc.green('[X] INCLUIDO EN EL EQUIPO')) + pc.dim(' (Presiona [ESPACIO] para desmarcar)')
              : pc.bold(pc.yellow('[ ] NO INCLUIDO')) + pc.dim(' (Presiona [ESPACIO] para seleccionar)')
          }`
        );

        if (activeOption.details && activeOption.details.length > 0) {
          for (const d of activeOption.details) {
            lines.push(`${pc.cyan('│')} ${pc.dim('•')} ${pc.white(d)}`);
          }
        } else if (activeOption.hint) {
          lines.push(`${pc.cyan('│')} ${pc.dim('•')} ${pc.white(activeOption.hint)}`);
        }

        lines.push(pc.cyan('└' + '─'.repeat(60)));
      }

      // If validation error
      if (this.state === 'error' && this.error) {
        lines.push(`${pc.red('[!]')} ${pc.yellow(this.error)}`);
      }

      // Keyboard instructions footer
      lines.push(
        pc.dim(
          'Controles: [↑/↓] Mover cursor  |  [ESPACIO] Marcar/Desmarcar  |  [A] Todos  |  [ENTER] Confirmar'
        )
      );

      return lines.join('\n') + '\n';
    }
  });

  const result = await prompt.prompt();
  return result as T[] | symbol;
}

/**
 * Enhanced Single Select with positional counter, active highlight and live details.
 */
export async function positionalSelect<T = string>(
  config: PositionalSelectConfig<T>
): Promise<T | symbol> {
  const initialIndex = config.initialValue
    ? Math.max(0, config.options.findIndex((o) => o.value === config.initialValue))
    : 0;

  const prompt = new SelectPrompt({
    options: config.options.map((opt) => ({
      value: opt.value,
      label: opt.label,
      hint: opt.hint,
      disabled: opt.disabled
    })),
    initialValue: config.initialValue,
    render() {
      const total = this.options.length;
      const currentPos = this.cursor + 1;
      const activeOption = config.options[this.cursor];

      // Submit state
      if (this.state === 'submit') {
        return `\n${pc.green('[OK]')} ${pc.bold(config.message)}: ${pc.cyan(activeOption?.label || '')}\n\n`;
      }

      // Cancel state
      if (this.state === 'cancel') {
        return `\n${pc.red('[X]')} ${pc.dim(`${config.message}: Cancelado.`)}\n\n`;
      }

      const lines: string[] = [];

      // Top Breadcrumb & Status Header
      const headerTitle = config.title ?? 'SELECCION DE OPCION';
      lines.push(
        `${pc.bgCyan(pc.black(` ${headerTitle} `))} ` +
        `${pc.bold(pc.cyan(`[POSICION ${currentPos} DE ${total}]`))}`
      );
      lines.push(`${pc.bold(config.message)}`);
      lines.push('');

      // Options List
      config.options.forEach((opt, idx) => {
        const isFocused = idx === this.cursor;

        if (isFocused) {
          const cursorBadge = pc.bgCyan(pc.black(` ▶ [${idx + 1}/${total}] `));
          const labelText = pc.bold(pc.white(opt.label));
          const badgeText = opt.badge ? pc.yellow(` [${opt.badge}]`) : '';
          const hintText = opt.hint ? pc.dim(` — ${opt.hint}`) : '';
          lines.push(`${cursorBadge} ${labelText}${badgeText}${hintText}`);
        } else {
          const cursorBadge = pc.dim(`   [${idx + 1}/${total}] `);
          const labelText = pc.dim(opt.label);
          const badgeText = opt.badge ? pc.dim(` [${opt.badge}]`) : '';
          lines.push(`${cursorBadge} ${labelText}${badgeText}`);
        }
      });

      lines.push('');

      // Live Details Box if details or hint exist
      if (activeOption && (activeOption.details || activeOption.hint)) {
        lines.push(
          pc.cyan('┌─') +
          pc.bold(pc.cyan(` INFO EN POSICION [${currentPos} DE ${total}]: `)) +
          pc.bold(pc.white(activeOption.label)) +
          pc.cyan(' ─'.repeat(Math.max(2, 20 - Math.min(15, activeOption.label.length))))
        );

        if (activeOption.details && activeOption.details.length > 0) {
          for (const d of activeOption.details) {
            lines.push(`${pc.cyan('│')} ${pc.dim('•')} ${pc.white(d)}`);
          }
        } else if (activeOption.hint) {
          lines.push(`${pc.cyan('│')} ${pc.dim('•')} ${pc.white(activeOption.hint)}`);
        }

        lines.push(pc.cyan('└' + '─'.repeat(60)));
      }

      // Keyboard footer
      lines.push(
        pc.dim('Controles: [↑/↓] Mover posicion  |  [ENTER] Confirmar seleccion  |  [Ctrl+C] Cancelar')
      );

      return lines.join('\n') + '\n';
    }
  });

  const result = await prompt.prompt();
  return result as T | symbol;
}

export { isCancel };
