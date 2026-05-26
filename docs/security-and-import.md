# Security and Import Notes

## API security

- `JwtAuthGuard` is registered globally and accepts the HTTP-only `nexus_session` cookie on protected routes. Bearer tokens are still accepted for administrative/API tooling.
- The frontend must not store sensitive tokens in `localStorage`; authenticated browser calls use `credentials: "include"`.
- `@Public()` is restricted to login/logout, health check and the stateless production calculation preview.
- `RolesGuard` reads `@Roles(...)` metadata and blocks users outside the allowed role set.
- `ADMIN` can access every role-protected route by policy.
- Human API errors are returned for missing, invalid or expired sessions.
- Workbook-derived JSON must not be written to `apps/web`. Private migration exports go under `data/private` or another backend-only location.

## Workbook import

`scripts/import_excel.py` reads the XLSX package directly and does not require Excel, pandas or openpyxl.

The current normalized product flow:

1. Read workbook sheets and cached formula errors.
2. Extract `Pacotes-caixas` rows as product identity and package/box configuration.
3. Extract `Banco de Dados Pesagen` rows as mass weight, box weight and target package weight.
4. Merge by product code.
5. Preserve source sheet/row references.
6. Emit duplicate and missing-field issues as import-error-shaped objects.

Known duplicated weighing codes in the supplied workbook:

- `70974`
- `73735`
- `76379`
- `76678`

The importer never imports formula errors such as `#N/A`, `#REF!`, `#DIV/0!` or `#VALUE!` as numbers.
