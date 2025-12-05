---
trigger: always_on
---

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

- Le MCP exa, c'est ton browser. A chaque fois que tu veux faire une recherche en ligne, tu l'utilises. Quand tu n'es pas sûr d'un truc ou bien tu veux faire une recherche en ligne, tu utilises ce MCP. 