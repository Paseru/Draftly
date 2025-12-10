**## Utilisation de Convex pour tout le backend**

- ***IMPORTANT : Toute la logique backend de cette application doit être implémentée dans Convex.****
- Toutes les opérations de lecture, d’écriture, de validation, d’authentification et d’autorisation doivent passer par des functions Convex (queries, mutations, actions) dans le dossier `my-app/convex/`.
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

- Le MCP exa, c'est ton browser. A chaque fois que tu veux faire une recherche en ligne, tu l'utilises. Quand tu n'es pas sûr d'un truc ou bien tu veux faire une recherche en ligne, tu utilises ce MCP.``

---

# mgrep - Recherche de code par défaut

**IMPORTANT : Utilise TOUJOURS `mgrep` pour chercher du code dans le codebase.**

- Au lieu d'utiliser `grep`, `Grep`, `Glob`, ou d'autres outils de recherche classiques, utilise `mgrep` en priorité.
- `mgrep` fait de la recherche sémantique : tu peux poser des questions en langage naturel comme "où est le code d'authentification" ou "comment fonctionne le paiement Stripe".
- Commande : `/Users/hyrak/.npm-global/bin/mgrep "ta question ici"`
- Assure-toi que `mgrep watch` tourne en arrière-plan pour que l'index soit à jour.

**IMPORTANT : mgrep est un outil, pas une réponse.**
- Ne jamais s'arrêter au premier résultat. Toujours valider que le résultat correspond exactement à la demande de l'utilisateur.
- Si le résultat semble proche mais pas exact, continuer à chercher avec des termes différents.
- Lire le code trouvé et vérifier qu'il répond bien à la question avant de répondre à l'utilisateur.
- Itérer jusqu'à trouver la vraie réponse, pas une réponse approximative.

**IMPORTANT : Analyser les résultats avant de continuer à chercher.**
- Une fois qu'un fichier pertinent est trouvé (bon score de match), l'analyser complètement.
- Si le fichier contient la réponse à la question, ARRÊTER la recherche et répondre immédiatement.
- Ne pas chercher d'autres fichiers si la réponse est déjà dans les résultats actuels.
- Faire le lien entre le nom du fichier/composant et le concept demandé par l'utilisateur (ex: "PlanReview" = "bloc architecture").

**IMPORTANT : Ne pas se focaliser sur un seul mot-clé.**
- Quand l'utilisateur pose une question, extraire TOUS les concepts pertinents, pas seulement le terme qui semble principal.
- Chercher avec des termes génériques et techniques plutôt que des mots spécifiques au domaine métier.
- Si la première recherche ne donne pas de résultats pertinents, élargir immédiatement avec des synonymes et des termes plus génériques.
- Penser en anglais pour les recherches de code (les variables, fonctions et commentaires sont souvent en anglais).

Exemples :
```bash
/Users/hyrak/.npm-global/bin/mgrep "où sont gérées les sessions utilisateur"
/Users/hyrak/.npm-global/bin/mgrep "comment fonctionne l'upload de fichiers"
/Users/hyrak/.npm-global/bin/mgrep "validation des formulaires"