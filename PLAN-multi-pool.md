# Multi-pool API-støtte – plan

Status: ikke implementert enda.

Hensikt: utvide `BitAxeClient` og backend så appen kan hente status direkte fra flere pool-API-er (f. eks. Braiins, Luxor) i tillegg til lokale miner-API-er.

## Neste steg

1. Kartlegg hvilke felt som allerede vises i frontend
   - `src/types/index.ts`: `pool`, `poolPort`, `poolUser`
   - `src/api/bitaxe.ts`: eksisterende mapping
   - `src/screens/PoolsScreen.tsx`, `MinerDetailScreen.tsx`: UI
2. Utvid backend proxy/validering
   - `backend/src/utils/urlValidation.ts`: tillat pool-API-domener
   - `backend/src/routes/proxy.ts`: behold eksisterende sendingslogikk
3. Lag adapter i frontend
   - Eks: `src/services/poolAdapters/braiins.ts`, `luxor.ts`
   - Felles interface: `fetchPoolStatus(miner)` -> `{ hashrate, users, pool }`
4. Integrer i miner-statusoppdatering uten å endre proxy
   - Eks: utvid `src/api/bitaxe.ts` med mulighet for eksterne pool-data
5. Test dekning
   - Eks: `__tests__/poolAdapters.test.ts`
   - Oppdater CI hvis nye filer trengs bygget
