# Audit securite - perimetre hors Stripe (05/12/2025)

**Mise a jour: 10/12/2025 - Corrections appliquees**

## Resume executif
- ~~Deux API Next publiques sans controle serveur permettent de consommer le LLM et contourner toute facturation interne.~~ **CORRIGE**
- ~~Deux mutations Convex exposees permettent de reinitialiser gratuitement le quota et le free trial.~~ **CORRIGE**
- ~~Rendu d'HTML genere par l'IA dans une iframe avec `allow-scripts allow-same-origin` : auto-XSS possible.~~ **CORRIGE**
- ~~Previews de projets gardent `allow-same-origin`, affaiblissant l'isolation.~~ **CORRIGE**

## Vulnerabilites critiques - CORRIGEES

### API IA non authentifiees
- **Status**: CORRIGE (10/12/2025)
- **Fichiers modifies**:
  - `src/app/api/generate/route.ts` - Auth Convex + verification quota ajoutees
  - `src/app/api/design-system/route.ts` - Auth Convex ajoutee
  - `src/app/api/extract-name/route.ts` - Auth Convex ajoutee
- **Protection supplementaire**: Rate limiting (10 req/min par IP) dans `src/middleware.ts`

### Reinitialisation de quota par utilisateur
- **Status**: CORRIGE (10/12/2025)
- **Fichier modifie**: `convex/users.ts`
- **Changements**: `resetFreeTrial` et `resetMonthlyGenerations` convertis en `internalMutation`

## Vulnerabilites elevees - CORRIGEES

### Auto-XSS sur la previsualisation
- **Status**: CORRIGE (10/12/2025)
- **Fichiers modifies**:
  - `src/components/PreviewNode.tsx` - `allow-same-origin` retire du sandbox
  - `src/components/HtmlPreview.tsx` - `allow-same-origin` retire du sandbox

## Suivi / To-do
- [x] Patcher les routes API pour verifier le token Convex et le quota
- [x] Passer les mutations de reset en `internalMutation`
- [x] Mettre a jour les attributs `sandbox` des iframes
- [x] Ajouter rate limiting au middleware
- [ ] Ajouter des tests d'integration pour les controles d'acces

## Corrections appliquees (10/12/2025)

| Vulnerabilite | Fichier | Correction |
|---------------|---------|------------|
| API sans auth | `src/app/api/generate/route.ts` | `convexAuthNextjsToken()` + quota check |
| API sans auth | `src/app/api/design-system/route.ts` | `convexAuthNextjsToken()` |
| API sans auth | `src/app/api/extract-name/route.ts` | `convexAuthNextjsToken()` |
| Mutation publique | `convex/users.ts:resetFreeTrial` | `internalMutation` |
| Mutation publique | `convex/users.ts:resetMonthlyGenerations` | `internalMutation` |
| XSS iframe | `src/components/PreviewNode.tsx` | `sandbox="allow-scripts"` |
| XSS iframe | `src/components/HtmlPreview.tsx` | `sandbox="allow-scripts"` |
| Spam API | `src/middleware.ts` | Rate limit 10 req/min par IP |
