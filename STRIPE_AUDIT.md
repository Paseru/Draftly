# Audit Stripe – 2025-12-05

## Résumé rapide
Implémentation globalement authentifiée côté serveur, pas de clés Stripe exposées côté client. Deux failles logiques permettent de contourner la facturation et de revendiquer une souscription d’autrui. Journaux potentiellement sensibles. Quelques endpoints morts et duplication d’IDs de prix.

## Vulnérabilités / risques
- **Price ID non validé** — `convex/stripe.ts` `createSubscriptionCheckout` accepte tout `priceId` fourni par le client (l.26-73). Un utilisateur peut passer un price Stripe gratuit ou promotionnel pour s’abonner sans payer.
- **Revendication de souscription par e‑mail** — `syncSubscriptionFromStripe` cherche le customer par email et n’exige pas que `metadata.userId` corresponde à l’utilisateur (l.278-370). Une souscription Stripe créée sans metadata ou avec email partagé peut être récupérée par quelqu’un contrôlant l’adresse.
- **Logs sensibles** — même fonction loggue l’objet Subscription complet (`console.log(JSON.stringify(subscription…))`) + métadonnées (l.318-345), exposant PII dans les logs Convex.
- **Webhook secret à vérifier** — `convex/http.ts` s’appuie sur `@convex-dev/stripe` pour vérifier les webhooks (l.4-34). Aucune vérification locale de `STRIPE_WEBHOOK_SECRET` visible; si la variable manque, les événements peuvent ne pas être authentifiés.
- **Customer Portal mal adressé** — `createCustomerPortal` utilise `identity.subject` comme `customerId` Stripe (l.79-119), valeur non Stripe. Action exposée mais non utilisée; peut échouer ou pointer un mauvais client.

## Problèmes de qualité / code mort
- Endpoints non utilisés : `createCustomerPortal` et `reactivateSubscription` (l.79-119, l.525-552) ne sont appelés nulle part.
- Duplication des IDs de prix dans trois fichiers (`convex/stripe.ts`, `src/components/SubscriptionModal.tsx`, `src/app/subscription/page.tsx`) ⇒ risque de divergence.
- Bibliothèque `@convex-dev/stripe@0.1.1` est une early release; vérifier s’il existe des correctifs de sécurité ou régressions.

## Actions recommandées (ordre)
1) Whitelister côté serveur `priceId` contre `STRIPE_PRICES`; ignorer toute valeur client. 
2) Persister `stripeCustomerId` (depuis Checkout) dans la table `users`; dans `syncSubscriptionFromStripe`, refuser toute subscription sans `metadata.userId` égal à l’utilisateur; ne jamais faire de lookup par email.
3) Supprimer ou anonymiser les logs bruts de subscription.
4) Confirmer que `STRIPE_WEBHOOK_SECRET` est bien défini et consommé par `@convex-dev/stripe` (sinon, valider manuellement la signature dans `handleSubscriptionEvent`).
5) Supprimer/brancher `createCustomerPortal` et `reactivateSubscription`; centraliser les prix dans un module partagé importé par front/back.
6) Mettre à jour `@convex-dev/stripe` et `stripe` vers les versions stables récentes après vérification des release notes.

## Fichiers touchés
- `convex/stripe.ts`
- `convex/http.ts`
- `src/components/SubscriptionModal.tsx`
- `src/app/subscription/page.tsx`
