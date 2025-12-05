# Audit sécurité – périmètre hors Stripe (05/12/2025)

## Résumé exécutif
- Deux API Next publiques sans contrôle serveur permettent de consommer le LLM et contourner toute facturation interne.
- Deux mutations Convex exposées permettent de réinitialiser gratuitement le quota et le « free trial ».
- Rendu d’HTML généré par l’IA dans une iframe avec `allow-scripts allow-same-origin` : auto‑XSS possible, accès aux cookies/localStorage.
- Préviews de projets gardent `allow-same-origin`, affaiblissant l’isolation.

## Vulnérabilités critiques
- **API IA non authentifiées** – `src/app/api/generate/route.ts:28` et `src/app/api/design-system/route.ts:11` acceptent n’importe quel POST, démarrent des runs Gemini (300s). Le paywall n’est que côté client (`src/app/page.tsx`). Un attaquant peut vider le quota LLM ou exfiltrer des réponses internes.  
  **Correctif** : exiger un jeton de session Convex côté serveur ou un header signé; ajouter rate‑limit par IP/user; refuser si quota mensuel atteint.
- **Réinitialisation de quota par tout utilisateur connecté** – `convex/users.ts:52-67` (`resetFreeTrial`) et `convex/users.ts:160-175` (`resetMonthlyGenerations`) sont des mutations publiques. Un utilisateur authentifié peut réactiver son essai et remettre son compteur à zéro.  
  **Correctif** : convertir en `internalMutation` et vérifier un rôle admin, ou supprimer ces actions en prod.

## Vulnérabilités élevées
- **Auto‑XSS sur la prévisualisation** – `src/components/PreviewNode.tsx:60-66` utilise `sandbox="allow-scripts allow-same-origin"`. Le HTML généré (non fiable) peut lire cookies/localStorage et appeler vos APIs en première partie.  
  **Correctif** : retirer `allow-same-origin` (voire `allow-scripts`), ou servir l’aperçu depuis un sous‑domaine isolé.
- **Isolation partielle des préviews stockées** – `src/app/projects/page.tsx:121-126` embarque des iframes avec `allow-same-origin`. Les scripts sont bloqués, mais garder le même origin réduit la défense en profondeur.  
  **Correctif** : enlever `allow-same-origin` ici aussi.

## Recommandations immédiates (ordre)
1) Ajouter une vérification d’auth + quota côté serveur sur `/api/generate` et `/api/design-system`.  
2) Rendre `resetFreeTrial` et `resetMonthlyGenerations` internes ou réservées à un rôle admin.  
3) Durcir l’iframe : supprimer `allow-same-origin` (et idéalement `allow-scripts`) pour les rendus IA et préviews projets.  
4) Ajouter du rate‑limit (middleware edge ou proxy) sur les routes IA pour limiter l’abus anonyme.

## Suivi / To‑do
- [ ] Patcher les deux routes API pour vérifier le token Convex et le quota.  
- [ ] Passer les mutations de reset en `internalMutation` + contrôle rôle.  
- [ ] Mettre à jour les attributs `sandbox` des iframes.  
- [ ] Ajouter des tests d’intégration pour les contrôles d’accès (ex. appeler `/api/generate` sans session doit 401).

