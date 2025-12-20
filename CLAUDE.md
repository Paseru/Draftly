**## Utilisation de Convex pour tout le backend**

- ***IMPORTANT : Toute la logique backend de cette application doit être implémentée dans Convex.****
- Toutes les opérations de lecture, d’écriture, de validation, d’authentification et d’autorisation doivent passer par des functions Convex (queries, mutations, actions) dans le dossier `/convex`.
- Il ne faut pas utiliser d’API routes Next.js ou d’autres serveurs backend pour la logique métier ou l’accès à la base de données.
- Le frontend (Next.js, React, etc.) doit appeler les functions Convex via le client Convex.
- Convex gère la sécurité, la cohérence des données, les transactions et la réactivité temps réel.
- ***Résumé : Convex est le backend unique de cette application.****

Pour plus d’informations, voir la documentation officielle :

- [Convex Overview](https://docs.convex.dev/understanding#server-functions)

---

# MCP context7 - Quand l'utiliser

- Tu as un doute sur une bibliothèque/API récente ou peu connue
- Tu as besoin d'exemples concrets d'implémentation
- Tu cherches des solutions à une erreur spécifique
- Tu veux vérifier les meilleures pratiques actuelles (post-janvier 2025)


---

# MCP EXA

- Le MCP exa, c'est ton browser. A chaque fois que tu veux faire une recherche en ligne, tu l'utilises. Quand tu n'es pas sûr d'un truc ou bien tu veux faire une recherche en ligne, tu utilises ce MCP.

---

# mgrep - Recherche de code

- **RÈGLE OBLIGATOIRE : Pour TOUTE recherche de code dans le codebase, utilise `mgrep` via Bash. N'utilise JAMAIS grep ou Grep tool.**
- `mgrep` est une recherche **sémantique** : décris ce que tu cherches en langage naturel, pas avec des regex.
- Exemples :
  - `mgrep "What code parsers are available?"` - cherche dans le répertoire courant
  - `mgrep "How are chunks defined?" src/models` - cherche dans un répertoire spécifique
  - `mgrep -m 10 "query"` - limite à 10 résultats
- À éviter : requêtes trop vagues (`mgrep "parser"`) ou filtres inutiles (`--type`, `--context`)
- **Subagents** : Tu peux utiliser des subagents quand c'est nécessaire. Dans ce cas, demande-leur obligatoirement d'utiliser `mgrep` pour leurs recherches.