import { BENEFICIARIES, type BeneficiaryType } from '@/lib/beneficiary';

export type BeneficiaryChoice = { type: BeneficiaryType | ''; percentage: number };

export function BeneficiaryPicker({ id, value, onChange, onPercentageCommit, disabled, compact = false }: { id: string; value: BeneficiaryChoice; onChange: (value: BeneficiaryChoice) => void; onPercentageCommit?: () => void; disabled?: boolean; compact?: boolean }) {
  return <div className={compact ? 'flex items-center gap-2' : 'flex flex-wrap items-center gap-2'}>
    <select id={id} className={`filter-select ${compact ? 'max-w-44' : 'flex-1 min-w-0'}`} aria-label="Para quem é este gasto" value={value.type} disabled={disabled} onChange={e => onChange({ ...value, type: e.target.value as BeneficiaryChoice['type'] })}>
      <option value="">A classificar</option>
      {BENEFICIARIES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
    </select>
    {value.type === 'Compartilhada' && <label className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
      <input type="number" min="0" max="100" step="1" className="filter-select w-16" aria-label="Percentual da Rebeca" value={value.percentage} disabled={disabled}
        onChange={e => onChange({ ...value, percentage: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} onBlur={onPercentageCommit}/>
      % Rebeca
    </label>}
  </div>;
}
