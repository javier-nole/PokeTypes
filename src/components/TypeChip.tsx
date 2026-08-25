import type { PokemonType } from '@/lib/types';
import { typeName } from '@/lib/i18n';

/**
 * El chip de tipo. Pieza central del diseño: el color canónico del tipo vive
 * SÓLO en la barra lateral de 4-7px; el nombre usa la variante `-ink`, que
 * pasa AA sobre superficie oscura. Ver CLAUDE.md → Diseño.
 */

export type ChipSize = 'xs' | 'sm' | 'md' | 'lg';
export type ChipTone = 'flat' | 'raised' | 'good' | 'muted';

const SIZES: Record<ChipSize, { chip: string; bar: string; text: string }> = {
  xs: { chip: 'h-8 gap-[7px] rounded-lg px-[11px]', bar: 'w-1 h-4', text: 'text-sm font-semibold' },
  sm: {
    chip: 'h-9 gap-[7px] rounded-[9px] px-3',
    bar: 'w-[5px] h-[18px]',
    text: 'text-[14.5px] font-semibold',
  },
  md: {
    chip: 'h-[46px] gap-2 rounded-[10px] px-[15px]',
    bar: 'w-[6px] h-6',
    text: 'text-[17px] font-bold',
  },
  lg: {
    chip: 'h-14 gap-[10px] rounded-[11px] px-[18px]',
    bar: 'w-[7px] h-[30px]',
    text: 'text-[21px] font-bold',
  },
};

const TONES: Record<ChipTone, string> = {
  flat: 'bg-surface',
  raised: 'bg-surface-2 border border-border-strong',
  good: 'bg-multhalf-bg border border-multhalf-border',
  muted: 'bg-surface-2 border border-border',
};

interface TypeChipProps {
  readonly type: PokemonType;
  readonly size?: ChipSize;
  readonly tone?: ChipTone;
}

export function TypeChip({ type, size = 'sm', tone = 'flat' }: TypeChipProps) {
  const style = SIZES[size];

  return (
    <span
      className={`inline-flex shrink-0 items-center ${style.chip} ${TONES[tone]} ${style.text}`}
      style={{ color: `var(--t-${type}-ink)` }}
    >
      <span
        aria-hidden="true"
        className={`shrink-0 rounded-sm ${style.bar}`}
        style={{ background: `var(--t-${type})` }}
      />
      {typeName(type)}
    </span>
  );
}

/**
 * Sólo la barra de color, sin nombre. Se usa donde el espacio no da para el
 * texto (cabeceras de la matriz de equipo, sugerencias del buscador) y
 * siempre acompañada del nombre en el `aria-label` del contenedor.
 */
export function TypeBars({ types }: { readonly types: readonly PokemonType[] }) {
  return (
    <span aria-hidden="true" className="flex gap-1">
      {types.map((type) => (
        <span
          key={type}
          className="h-1.5 w-[18px] rounded-sm"
          style={{ background: `var(--t-${type})` }}
        />
      ))}
    </span>
  );
}
