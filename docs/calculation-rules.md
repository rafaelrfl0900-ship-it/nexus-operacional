# NEXUS OPERACIONAL - Calculation Rules

The legacy Excel formulas are implemented as pure backend/domain functions.

## Production

- `producedKg = packedBoxes * boxWeightKg`
- Alternative per product: `producedKg = packedBoxes * packagesPerBox * packageWeightKg`
- `expectedYieldKg = realizedBatches * massWeightKg + usedReworkKg`
- `realYieldPercent = producedKg / expectedYieldKg`

All divisions use safe guards. Zero, null, invalid values and non-finite numbers return `0` plus an inconsistency message when relevant.

## Overweight

- `overweightGPerPackage = max(averagePackageWeightG - targetPackageWeightG, 0)`
- `packageCount = packedBoxes * packagesPerBox`
- `overweightTotalKg = overweightGPerPackage * packageCount / 1000`
- `overweightPercent = overweightTotalKg / producedKg`

Subweight is intentionally not treated as negative overweight. It is reserved for a future module.

## Losses

Losses are recorded as independent entries by type and also receive automatic production-derived components:

- weighing loss
- packaging loss
- box loss
- organic loss
- machine loss
- overweight loss
- other loss

## Downtime

- `availableMinutes = productionEnd - productionStart`
- `stoppedMinutes = downtimeEnd - downtimeStart`
- `productiveMinutes = availableMinutes - stoppedMinutes`
- `stoppedPercent = stoppedMinutes / availableMinutes`
- `efficiencyPercent = productiveMinutes / availableMinutes`
- `realKgHour = producedMassKg / availableHours`
- `possibleKgHour = producedMassKg / productiveHours`

Status defaults:

- OK: stopped percent below 5%
- MEDIUM: 5% to below 10%
- ATTENTION: 10% to below 20%
- CRITICAL: 20% or higher
