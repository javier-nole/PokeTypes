import { formatMultiplier, multiplierAria, severityLabel } from '@/lib/i18n';
import type { Multiplier } from '@/lib/types';

/**
 * Las cuatro señales redundantes del diseño. Nunca se usa una sola: número,
 * palabra, medidor y posición van siempre juntos, y el color es el refuerzo.
 */

/** Superficie, borde y tinta de cada nivel. */
export const SEVERITY: Record<
  Multiplier,
  { readonly surface: string; readonly ink: string; readonly cell: string }
> = {
  4: {
    surface: 'bg-mult4-bg border border-mult4-border',
    ink: 'text-mult4-ink',
    cell: 'bg-mult4-bg text-mult4-ink',
  },
  2: { surface: 'bg-mult2-bg', ink: 'text-mult2-ink', cell: 'bg-mult2-bg text-mult2-ink' },
  1: { surface: 'bg-mult1-bg', ink: 'text-mult1-ink', cell: 'bg-mult1-cell text-mult1-ink' },
  0.5: {
    surface: 'bg-multhalf-bg',
    ink: 'text-multhalf-ink',
    cell: 'bg-multhalf-bg text-multhalf-ink',
  },
  0.25: {
    surface: 'bg-multquarter-bg border border-multquarter-border',
    ink: 'text-multquarter-ink',
    cell: 'bg-multquarter-bg text-multquarter-ink',
  },
  0: { surface: 'bg-mult0-bg', ink: 'text-mult0-ink', cell: 'bg-mult0-bg text-mult0-ink' },
};

/**
 * La misma escala con el signo invertido, para cuando el multiplicador
 * describe lo que TÚ haces y no lo que te hacen. Un ×4 defensivo es rojo
 * porque te mata; un ×4 ofensivo es verde porque lo matas. Usar la paleta
 * defensiva en la vista de ataque haría leer "peligro" donde pone "ganas".
 */
export const OFFENSIVE_INK: Record<Multiplier, string> = {
  4: 'text-multhalf-ink',
  2: 'text-multhalf-ink',
  1: 'text-ink-muted',
  0.5: 'text-mult2-ink',
  0.25: 'text-mult2-ink',
  0: 'text-mult4-ink',
};

/**
 * Las celdas del cuadro de cobertura, con la misma inversión de signo que
 * `OFFENSIVE_INK`. Aquí el ×4 es la casilla verde de "esto lo revientas" y
 * el ×0 la roja de "no tienes por dónde entrarle": exactamente al revés que
 * en `SEVERITY`, donde el ×4 es lo que te mata.
 */
export const OFFENSIVE_CELL: Record<Multiplier, string> = {
  4: 'bg-multquarter-bg text-multquarter-ink',
  2: 'bg-multhalf-bg text-multhalf-ink',
  1: 'bg-mult1-cell text-ink-muted',
  0.5: 'bg-mult2-bg text-mult2-ink',
  0.25: 'bg-mult2-bg text-mult2-ink',
  0: 'bg-mult4-bg text-mult4-ink',
};

/**
 * Medidor de bloques: cuatro casillas, tantas llenas como el multiplicador.
 * Sólo aparece donde hay peligro (×4 y ×2); en las bandas defensivas buenas
 * el número y la palabra ya bastan y el medidor sería ruido.
 */
export function BlockMeter({ filled, tone }: { readonly filled: number; readonly tone: string }) {
  return (
    <span aria-hidden="true" className="flex gap-1">
      {[0, 1, 2, 3].map((index) => (
        <span
          key={index}
          className={`h-[7px] w-[13px] rounded-[1px] sm:w-[18px] ${
            index < filled ? tone : 'border border-mult2-border'
          }`}
        />
      ))}
    </span>
  );
}

interface SeverityStackProps {
  readonly multiplier: Multiplier;
  /** En la vista de ataque el signo se invierte y la palabra cambia. */
  readonly label?: string | null;
}

/** La columna izquierda de una banda: número grande, medidor y palabra. */
export function SeverityStack({ multiplier, label }: SeverityStackProps) {
  const { ink } = SEVERITY[multiplier];
  const word = label === undefined ? severityLabel(multiplier) : label;

  const numberSize =
    multiplier === 4
      ? 'text-[46px] sm:text-[56px] tracking-[-.05em]'
      : multiplier === 2
        ? 'text-[30px] sm:text-4xl tracking-[-.04em]'
        : 'text-2xl sm:text-[28px]';

  return (
    <div className="flex w-[78px] shrink-0 flex-col gap-2 sm:w-[108px]">
      <span className={`font-mono font-bold leading-[.85] ${numberSize} ${ink}`}>
        {formatMultiplier(multiplier)}
        <span className="sr-only"> — {multiplierAria(multiplier)}</span>
      </span>

      {multiplier > 1 ? (
        <BlockMeter
          filled={multiplier === 4 ? 4 : 3}
          tone={multiplier === 4 ? 'bg-mult4-ink' : 'bg-mult2-ink'}
        />
      ) : null}

      {word !== null ? (
        <span className={`font-mono text-[10px] font-bold tracking-[.14em] sm:text-[11px] ${ink}`}>
          {word}
        </span>
      ) : null}
    </div>
  );
}
