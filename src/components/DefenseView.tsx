import { SEVERITY, SeverityStack } from '@/components/severity';
import { TypeChip, type ChipSize, type ChipTone } from '@/components/TypeChip';
import type { DefensiveProfile } from '@/lib/effectiveness';
import { typeName } from '@/lib/i18n';
import type { Multiplier } from '@/lib/types';

/**
 * "¿Qué me mata?" — la vista que abre por defecto en móvil, porque en
 * combate es la pregunta urgente.
 *
 * No calcula nada: recibe el perfil ya resuelto por `src/lib`.
 */

/** El tamaño del chip crece con el peligro: el área es la primera señal. */
const CHIP: Record<Multiplier, { size: ChipSize; tone: ChipTone }> = {
  4: { size: 'lg', tone: 'raised' },
  2: { size: 'md', tone: 'raised' },
  1: { size: 'sm', tone: 'flat' },
  0.5: { size: 'sm', tone: 'flat' },
  0.25: { size: 'sm', tone: 'flat' },
  0: { size: 'md', tone: 'muted' },
};

export function DefenseView({ profile }: { readonly profile: DefensiveProfile }) {
  const bands = profile.groups.filter((group) => group.multiplier !== 1);
  const neutral = profile.groups.find((group) => group.multiplier === 1);

  return (
    <section className="flex flex-col gap-2.5" aria-labelledby="defensa-titulo">
      <h2
        id="defensa-titulo"
        className="pb-1.5 font-mono text-xs font-bold tracking-[.16em] text-ink-dim"
      >
        DEFENSA · QUÉ LE HACE DAÑO
      </h2>

      {bands.map((group) => (
        <div
          key={group.multiplier}
          className={`flex gap-3.5 rounded-xl p-4 sm:gap-5 sm:rounded-[14px] sm:p-5 ${
            SEVERITY[group.multiplier].surface
          } ${group.multiplier === 4 ? 'py-6 sm:py-5' : ''}`}
        >
          <SeverityStack multiplier={group.multiplier} />
          <ul className="flex flex-1 list-none flex-wrap content-center items-center gap-2 p-0">
            {group.types.map((type) => (
              <li key={type}>
                <TypeChip
                  type={type}
                  size={CHIP[group.multiplier].size}
                  tone={CHIP[group.multiplier].tone}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Los neutros no son una respuesta: van plegados en una línea. */}
      {neutral !== undefined ? (
        <details className="group rounded-xl bg-surface">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4 sm:px-5">
            <span className="w-[78px] shrink-0 font-mono text-base font-bold text-ink-muted sm:w-[108px] sm:text-xl">
              ×1
            </span>
            <span className="flex-1 text-[13px] font-medium text-ink-muted sm:text-[13.5px]">
              {neutral.types.length} tipos hacen daño normal
            </span>
            <span aria-hidden="true" className="pr-1.5 text-xl text-ink-dim">
              <span className="group-open:hidden">+</span>
              <span className="hidden group-open:inline">−</span>
            </span>
          </summary>
          <p className="px-4 pb-4 text-[13.5px] leading-relaxed text-ink-muted sm:px-5">
            {neutral.types.map((type) => typeName(type)).join(' · ')}
          </p>
        </details>
      ) : null}
    </section>
  );
}
