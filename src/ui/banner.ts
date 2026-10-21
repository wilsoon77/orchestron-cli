import gradient from 'gradient-string';
import pc from 'picocolors';

// Cyan to Mint Green Palette (Blue to Green spectrum requested by user)
export const brandGradient = gradient(['#00F5FF', '#00E5FF', '#10E891', '#00FF87']);
export const borderGradient = gradient(['#0284C7', '#0F766E', '#059669']);

export function printBanner(): void {
  // Enhanced Geometric Aperture / Orchestration Core (Balanced octagonal ring + floating center node)
  const logoLines = [
    '       ██████       ',
    '     ████  ████     ',
    '    ████    ████    ',
    '    ████ ██ ████    ',
    '    ████    ████    ',
    '     ████  ████     ',
    '       ██████       '
  ];

  console.log('');
  for (let i = 0; i < logoLines.length; i++) {
    const renderedLogoPart = brandGradient(logoLines[i]);
    let textSide = '';

    if (i === 1) {
      textSide = pc.bold(pc.white('O R C H E S T R O N'));
    } else if (i === 2) {
      textSide = brandGradient('Autonomous Multi-Agent Architecture');
    } else if (i === 3) {
      textSide = pc.dim('Quality Gates & Living Context System');
    } else if (i === 4) {
      textSide = pc.dim('v2.0.0 · Antigravity / Claude Code / Cursor');
    }

    console.log(`  ${renderedLogoPart}   ${textSide}`);
  }

  console.log('  ' + borderGradient('─'.repeat(74)) + '\n');
}

export function printStepHeader(step: number, total: number, title: string): void {
  console.log(
    `\n${pc.bgCyan(pc.black(` STEP ${step}/${total} `))} ${pc.bold(pc.white(title))}\n`
  );
}

export function printSuccessBox(message: string): void {
  console.log(`\n${pc.green('[OK]')} ${pc.bold(pc.white(message))}`);
}
