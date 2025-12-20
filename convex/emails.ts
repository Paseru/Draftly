"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// =============================================================================
// EMAIL HTML - Compatible avec tous les clients email
// =============================================================================
const ANNOUNCEMENT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Draftly Update</title>
    <!--[if mso]>
    <style type="text/css">
        table, td {font-family: Arial, sans-serif !important;}
    </style>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #1e1e1e; font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace; -webkit-font-smoothing: antialiased;">
    <!-- Wrapper table for full background -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #1e1e1e; margin: 0; padding: 0;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                
                <!-- Main container -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px;">
                    
                    <!-- Logo Header -->
                    <tr>
                        <td align="center" style="padding-bottom: 40px;">
                            <a href="https://draftly.live" style="text-decoration: none;">
                                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td style="width: 40px; height: 40px; background-color: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 12px; text-align: center; vertical-align: middle;">
                                            <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTguMzcgMi42M0wxNCA3TDE3IDEwTDIxLjM3IDUuNjNDMjIuMjEgNC43OSAyMi4yMSAzLjQ3IDIxLjM3IDIuNjNDMjAuNTMgMS43OSAxOS4yMSAxLjc5IDE4LjM3IDIuNjNaIiBmaWxsPSIjNjBhNWZhIiBmaWxsLW9wYWNpdHk9IjAuOCIvPjxwYXRoIGQ9Ik0xMyA4TDUuNSAxNS41QzQuNSAxNi41IDQgMTggNCAxOS41TDQuNSAyMEw1IDE5LjVDNi41IDE5LjUgOCAxOSA5IDE4TDE2IDExTDEzIDhaIiBmaWxsPSIjNjBhNWZhIiBmaWxsLW9wYWNpdHk9IjAuNiIvPjxwYXRoIGQ9Ik00IDE5LjVDNCAyMC44OCA1LjEyIDIyIDYuNSAyMkM3LjUgMjIgOC41IDIxLjUgOSAyMC41TDQuNSAyMEw0IDE5LjVaIiBmaWxsPSIjNjBhNWZhIi8+PC9zdmc+" alt="Draftly" width="20" height="20" style="display: block; margin: auto;">
                                        </td>
                                        <td style="padding-left: 10px; font-size: 24px; font-weight: 600; color: #e4e4e7; font-family: 'SF Mono', Monaco, Consolas, monospace;">
                                            Draftly
                                        </td>
                                    </tr>
                                </table>
                            </a>
                        </td>
                    </tr>
                    
                    <!-- English Content Box -->
                    <tr>
                        <td style="padding-bottom: 24px;">
                            <table role="presentation" width="100%" cellpadding="32" cellspacing="0" border="0" style="background-color: #252526; border-radius: 12px; border: 1px solid #3e3e42;">
                                <tr>
                                    <td style="font-family: 'SF Mono', Monaco, Consolas, 'Courier New', monospace; color: #d4d4d4;">
                                        <h1 style="color: #e4e4e7; font-size: 22px; margin: 0 0 24px 0; line-height: 1.3; font-weight: 600;">We've Fixed It All. Seriously. 🚀</h1>
                                        
                                        <p style="font-size: 14px; line-height: 1.7; margin: 0 0 18px 0; color: #a1a1aa;">Hi there,</p>
                                        
                                        <p style="font-size: 14px; line-height: 1.7; margin: 0 0 18px 0; color: #a1a1aa;">We want to sincerely apologize for the bugs and hiccups you may have encountered since the launch of Draftly. We know it hasn't been the smooth experience we aimed for.</p>
                                        
                                        <p style="font-size: 14px; line-height: 1.7; margin: 0 0 18px 0; color: #a1a1aa;">We've been working around the clock to address every single issue, and we're thrilled to announce that <span style="color: #60a5fa; font-weight: 500;">everything has been fixed from A to Z</span>.</p>
                                        
                                        <!-- Divider -->
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr><td style="height: 1px; background-color: #3e3e42; margin: 28px 0; padding: 0;"></td></tr>
                                        </table>
                                        <div style="height: 28px;"></div>
                                        
                                        <p style="font-size: 14px; line-height: 1.7; margin: 0 0 18px 0; color: #a1a1aa;">To make it up to you, we have:</p>
                                        
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                                            <tr>
                                                <td style="padding: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                                                    🔄 <strong style="color: #60a5fa;">Reset your credits</strong> so you can start fresh.
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                                                    ⏰ <strong style="color: #60a5fa;">Extended your free trial</strong> to give you ample time to explore.
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <p style="font-size: 14px; line-height: 1.7; margin: 0 0 18px 0; color: #a1a1aa;">And the best part? It's no longer just about generating a single screen. <span style="color: #60a5fa; font-weight: 500;">Draftly now generates every single screen in your entire project flow</span> — a complete, end-to-end generation.</p>
                                        
                                        <!-- CTA Button -->
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
                                            <tr>
                                                <td align="center">
                                                    <a href="https://draftly.live" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; font-family: Arial, sans-serif;">Start Creating Now →</a>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <p style="font-size: 14px; line-height: 1.7; margin: 0 0 18px 0; color: #a1a1aa;">We're incredibly excited for you to test this new, stable version. We can't wait to see what you build — whether it's a SaaS dashboard, an e-commerce store, a portfolio, or something entirely unique.</p>
                                        
                                        <p style="font-size: 14px; line-height: 1.7; margin: 0 0 18px 0; color: #a1a1aa;">We'd love to hear your feedback!</p>
                                        
                                        <p style="font-size: 14px; line-height: 1.7; margin: 0; color: #a1a1aa;">Best,<br><span style="color: #60a5fa;">The Draftly Team</span></p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- French Content Box -->
                    <tr>
                        <td>
                            <table role="presentation" width="100%" cellpadding="32" cellspacing="0" border="0" style="background-color: #252526; border-radius: 12px; border: 1px solid #3e3e42;">
                                <tr>
                                    <td style="font-family: 'SF Mono', Monaco, Consolas, 'Courier New', monospace; color: #d4d4d4;">
                                        <h1 style="color: #e4e4e7; font-size: 22px; margin: 0 0 24px 0; line-height: 1.3; font-weight: 600;">Tout a été corrigé. Vraiment. 🚀</h1>
                                        
                                        <p style="font-size: 14px; line-height: 1.7; margin: 0 0 18px 0; color: #a1a1aa;">Bonjour,</p>
                                        
                                        <p style="font-size: 14px; line-height: 1.7; margin: 0 0 18px 0; color: #a1a1aa;">Nous tenons à nous excuser sincèrement pour les bugs et les problèmes que vous avez pu rencontrer depuis le lancement de Draftly. Nous savons que l'expérience n'a pas été à la hauteur de nos attentes.</p>
                                        
                                        <p style="font-size: 14px; line-height: 1.7; margin: 0 0 18px 0; color: #a1a1aa;">Nous avons travaillé sans relâche pour résoudre chaque problème, et nous sommes ravis de vous annoncer que <span style="color: #60a5fa; font-weight: 500;">tout a été corrigé de A à Z</span>.</p>
                                        
                                        <!-- Divider -->
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr><td style="height: 1px; background-color: #3e3e42; margin: 28px 0; padding: 0;"></td></tr>
                                        </table>
                                        <div style="height: 28px;"></div>
                                        
                                        <p style="font-size: 14px; line-height: 1.7; margin: 0 0 18px 0; color: #a1a1aa;">Pour nous faire pardonner :</p>
                                        
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 20px;">
                                            <tr>
                                                <td style="padding: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                                                    🔄 <strong style="color: #60a5fa;">Vos crédits ont été réinitialisés</strong> pour repartir de zéro.
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 0 0 12px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                                                    ⏰ <strong style="color: #60a5fa;">Votre période d'essai a été prolongée</strong> pour vous laisser le temps d'explorer.
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <p style="font-size: 14px; line-height: 1.7; margin: 0 0 18px 0; color: #a1a1aa;">Et le meilleur ? Ce n'est plus seulement un écran qui est généré. <span style="color: #60a5fa; font-weight: 500;">Draftly génère désormais tous les écrans de votre projet</span> — une génération complète, de bout en bout.</p>
                                        
                                        <!-- CTA Button -->
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
                                            <tr>
                                                <td align="center">
                                                    <a href="https://draftly.live" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; font-family: Arial, sans-serif;">Commencer à créer →</a>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <p style="font-size: 14px; line-height: 1.7; margin: 0 0 18px 0; color: #a1a1aa;">Nous sommes impatients que vous testiez cette nouvelle version stable. Nous avons hâte de voir ce que vous allez créer — que ce soit un dashboard SaaS, une boutique en ligne, un portfolio, ou quelque chose d'unique.</p>
                                        
                                        <p style="font-size: 14px; line-height: 1.7; margin: 0 0 18px 0; color: #a1a1aa;">Vos retours nous feront très plaisir !</p>
                                        
                                        <p style="font-size: 14px; line-height: 1.7; margin: 0; color: #a1a1aa;">À très vite,<br><span style="color: #60a5fa;">L'équipe Draftly</span></p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding-top: 40px;">
                            <p style="font-size: 12px; color: #52525b; margin: 0 0 10px 0; font-family: Arial, sans-serif;">&copy; 2025 Draftly. All rights reserved.</p>
                            <p style="font-size: 12px; margin: 0; font-family: Arial, sans-serif;">
                                <a href="mailto:unsubscribe@draftly.live?subject=Unsubscribe" style="color: #52525b; text-decoration: underline;">Unsubscribe</a>
                            </p>
                        </td>
                    </tr>
                    
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

// =============================================================================
// ACTION PRINCIPALE : Envoyer l'annonce à TOUS les utilisateurs
// Utilise le Batch API de Resend pour envoyer jusqu'à 100 emails par requête
// Rate limit Resend: 2 requêtes/seconde, donc 1 seconde de délai entre batches
// =============================================================================
export const sendAnnouncementToAllUsers = action({
    args: {
        testMode: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        if (!RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY is not set. Add it in Convex Dashboard > Settings > Environment Variables");
        }

        const emails: string[] = await ctx.runQuery(internal.users.getAllEmails, {});

        if (emails.length === 0) {
            return {
                success: false,
                message: "Aucun utilisateur avec email trouvé"
            };
        }

        if (args.testMode) {
            return {
                success: true,
                testMode: true,
                message: "Mode test - Voici les emails qui recevraient l'email :",
                emails: emails,
                totalUsers: emails.length,
            };
        }

        const SUBJECT = "Your Draftly credits have been reset 🔄";
        // Resend Batch API permet jusqu'à 100 emails par requête
        const BATCH_SIZE = 100;
        // 1 seconde entre chaque batch pour respecter le rate limit (2 req/sec)
        const DELAY_BETWEEN_BATCHES_MS = 1000;

        let successCount = 0;
        let errorCount = 0;
        const errors: Array<{ email: string; error: string }> = [];

        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Diviser les emails en batches de 100 maximum
        for (let i = 0; i < emails.length; i += BATCH_SIZE) {
            const batchEmails = emails.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(emails.length / BATCH_SIZE);

            console.log(`📦 Batch ${batchNumber}/${totalBatches}: Envoi de ${batchEmails.length} emails...`);

            // Préparer les emails pour le Batch API
            const batchPayload = batchEmails.map((email) => ({
                from: "Draftly <noreply@draftly.live>",
                to: email,
                subject: SUBJECT,
                html: ANNOUNCEMENT_HTML,
                reply_to: "support@draftly.live",
                headers: {
                    "List-Unsubscribe": "<mailto:unsubscribe@draftly.live>",
                },
            }));

            try {
                // Utiliser l'endpoint Batch de Resend
                const response = await fetch("https://api.resend.com/emails/batch", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + RESEND_API_KEY,
                    },
                    body: JSON.stringify(batchPayload),
                });

                const result = await response.json();

                if (!response.ok) {
                    // Erreur globale du batch
                    console.error(`❌ Batch ${batchNumber} failed:`, result);
                    errorCount += batchEmails.length;
                    batchEmails.forEach((email) => {
                        errors.push({
                            email,
                            error: JSON.stringify(result),
                        });
                    });
                } else {
                    // Traiter les résultats du batch
                    // Le Batch API retourne { data: [{id: ...}, ...], errors?: [...] }
                    const successfulEmails = result.data?.length || 0;
                    const batchErrors = result.errors || [];

                    successCount += successfulEmails;

                    if (batchErrors.length > 0) {
                        batchErrors.forEach((err: { index: number; message: string }) => {
                            errorCount++;
                            errors.push({
                                email: batchEmails[err.index] || "unknown",
                                error: err.message,
                            });
                            console.error(`❌ Failed:`, batchEmails[err.index], err.message);
                        });
                    }

                    console.log(`✅ Batch ${batchNumber} terminé: ${successfulEmails} envoyés, ${batchErrors.length} erreurs`);
                }
            } catch (fetchError) {
                // Erreur réseau ou autre
                console.error(`❌ Batch ${batchNumber} network error:`, fetchError);
                errorCount += batchEmails.length;
                batchEmails.forEach((email) => {
                    errors.push({
                        email,
                        error: fetchError instanceof Error ? fetchError.message : "Network error",
                    });
                });
            }

            // Attendre avant le prochain batch (sauf pour le dernier)
            if (i + BATCH_SIZE < emails.length) {
                console.log(`⏳ Pause de ${DELAY_BETWEEN_BATCHES_MS}ms avant le prochain batch...`);
                await sleep(DELAY_BETWEEN_BATCHES_MS);
            }
        }

        console.log(`\n🎉 Envoi terminé! ${successCount}/${emails.length} emails envoyés avec succès.`);

        return {
            success: true,
            message: "Envoi terminé !",
            totalUsers: emails.length,
            totalSent: successCount,
            totalErrors: errorCount,
            errors: errors.length > 0 ? errors : undefined,
        };
    },
});

// =============================================================================
// ACTION : Renvoyer l'annonce aux emails qui ont échoué (quota dépassé)
// Liste des 100 emails du 7 décembre 2024 qui n'ont pas reçu l'email
// =============================================================================
export const sendAnnouncementToFailedEmails = action({
    args: {
        testMode: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        if (!RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY is not set");
        }

        // Liste des 100 emails qui n'ont pas reçu l'email le 7 décembre 2024
        const FAILED_EMAILS = [
            "karinben77@gmail.com",
            "alexisturn888@gmail.com",
            "jeanhenry764@gmail.com",
            "reisschannel@gmail.com",
            "kanki.dev@gmail.com",
            "winforce94450hd@gmail.com",
            "mxtispro@gmail.com",
            "samiraouaicha31@gmail.com",
            "damienk06@gmail.com",
            "testnewemail111@gmail.com",
            "glitchgta46@gmail.com",
            "maxence.fortin53970@gmail.com",
            "romain.herrenknecht@gmail.com",
            "samuel310597@gmail.com",
            "pourpubpourpub322@gmail.com",
            "ledutir49@gmail.com",
            "curiosorez@gmail.com",
            "wil-et-sam@hotmail.fr",
            "trebotjoffrey@gmail.com",
            "proxydzz@gmail.com",
            "network1987@gmail.com",
            "henocmarc1@gmail.com",
            "hugonexxion@gmail.com",
            "arthur@arios.app",
            "eric.alliaume@greta-nord-alsace.com",
            "coruhoorhan52@gmail.com",
            "jk10192000@gmail.com",
            "angelguillen4@gmail.com",
            "tlo@volkeno.sn",
            "jeremy.poulain@gmail.com",
            "armebeton74@gmail.com",
            "azadbus78690123@gmail.com",
            "lucas.friederich@gmail.com",
            "publicmodedev@gmail.com",
            "monfraixludovicpro@gmail.com",
            "fastemail.flyn@gmail.com",
            "shizusensei7@gmail.com",
            "alexandre.ribeiro.vazquez@gmail.com",
            "gintokisakatatv@gmail.com",
            "belamine78@gmail.com",
            "gqdthinky@gmail.com",
            "korb.spams@gmail.com",
            "contact.hiver.gants@gmail.com",
            "quatadah.nasdami@gmail.com",
            "julien@vert-menthe.fr",
            "mboukhatemwow@gmail.com",
            "benjamin.mico@gmail.com",
            "jesuiselouan2@gmail.com",
            "trimoreauthomas@gmail.com",
            "joris.brianti@gmail.com",
            "mehdijchacroune@gmail.com",
            "marcchapeau@gmail.com",
            "taibasakho3@gmail.com",
            "clementenderson281@gmail.com",
            "maxime.gdn37@gmail.com",
            "asmrzone00@gmail.com",
            "johntenao@gmail.com",
            "rodriguek396@gmail.com",
            "riad.etm@gmail.com",
            "albandup1501@gmail.com",
            "kerian.laurier23@gmail.com",
            "fabien.vincent44@gmail.com",
            "johan.her.pro@gmail.com",
            "jlqueguiner@gladia.io",
            "ibrahimejunior00@gmail.com",
            "yfirre@gmail.com",
            "neonblist@gmail.com",
            "arik.mkm@gmail.com",
            "medd.fghl@gmail.com",
            "alfitori709@gmail.com",
            "ditharlesa@gmail.com",
            "jullian.dorian@gmail.com",
            "galacticspacesheep@gmail.com",
            "chris.bergont@gmail.com",
            "auxence@leplein.fr",
            "yohankoffik@gmail.com",
            "yohankoffik225@gmail.com",
            "marek.elmayan@theodo.com",
            "scolasala99@gmail.com",
            "tomredf@gmail.com",
            "tst20549@gmail.com",
            "saidboda94@gmail.com",
            "fresnetrenaud@gmail.com",
            "abdulmucib.ahmetoglu@gmail.com",
            "flavienhue3a@gmail.com",
            "webopass.jordan@gmail.com",
            "zedkah1z1@gmail.com",
            "afxl667@gmail.com",
            "mileyvalorant@gmail.com",
            "mercedev691@gmail.com",
            "maelcaubere6@gmail.com",
            "buildnext.fr@gmail.com",
            "hadjazyanis4@gmail.com",
            "nextgenaijournal@gmail.com",
            "raphael.meguellati@gmail.com",
            "guamsjonathan@gmail.com",
            "deneuxa@gmail.com",
            "azerjeremy95@gmail.com",
            "joshualyguessennd@icloud.com",
            "eva.meunier122@gmail.com",
        ];

        if (args.testMode) {
            return {
                success: true,
                testMode: true,
                message: "Mode test - Voici les emails qui recevraient l'email :",
                emails: FAILED_EMAILS,
                totalUsers: FAILED_EMAILS.length,
            };
        }

        const SUBJECT = "Your Draftly credits have been reset 🔄";
        const BATCH_SIZE = 100;
        const DELAY_BETWEEN_BATCHES_MS = 1000;

        let successCount = 0;
        let errorCount = 0;
        const errors: Array<{ email: string; error: string }> = [];

        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        console.log(`📧 Envoi aux ${FAILED_EMAILS.length} emails qui ont échoué le 7 décembre...`);

        for (let i = 0; i < FAILED_EMAILS.length; i += BATCH_SIZE) {
            const batchEmails = FAILED_EMAILS.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(FAILED_EMAILS.length / BATCH_SIZE);

            console.log(`📦 Batch ${batchNumber}/${totalBatches}: Envoi de ${batchEmails.length} emails...`);

            const batchPayload = batchEmails.map((email) => ({
                from: "Draftly <noreply@draftly.live>",
                to: email,
                subject: SUBJECT,
                html: ANNOUNCEMENT_HTML,
                reply_to: "support@draftly.live",
                headers: {
                    "List-Unsubscribe": "<mailto:unsubscribe@draftly.live>",
                },
            }));

            try {
                const response = await fetch("https://api.resend.com/emails/batch", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + RESEND_API_KEY,
                    },
                    body: JSON.stringify(batchPayload),
                });

                const result = await response.json();

                if (!response.ok) {
                    console.error(`❌ Batch ${batchNumber} failed:`, result);
                    errorCount += batchEmails.length;
                    batchEmails.forEach((email) => {
                        errors.push({ email, error: JSON.stringify(result) });
                    });
                } else {
                    const successfulEmails = result.data?.length || 0;
                    const batchErrors = result.errors || [];

                    successCount += successfulEmails;

                    if (batchErrors.length > 0) {
                        batchErrors.forEach((err: { index: number; message: string }) => {
                            errorCount++;
                            errors.push({
                                email: batchEmails[err.index] || "unknown",
                                error: err.message,
                            });
                            console.error(`❌ Failed:`, batchEmails[err.index], err.message);
                        });
                    }

                    console.log(`✅ Batch ${batchNumber} terminé: ${successfulEmails} envoyés, ${batchErrors.length} erreurs`);
                }
            } catch (fetchError) {
                console.error(`❌ Batch ${batchNumber} network error:`, fetchError);
                errorCount += batchEmails.length;
                batchEmails.forEach((email) => {
                    errors.push({
                        email,
                        error: fetchError instanceof Error ? fetchError.message : "Network error",
                    });
                });
            }

            if (i + BATCH_SIZE < FAILED_EMAILS.length) {
                console.log(`⏳ Pause de ${DELAY_BETWEEN_BATCHES_MS}ms...`);
                await sleep(DELAY_BETWEEN_BATCHES_MS);
            }
        }

        console.log(`\n🎉 Envoi terminé! ${successCount}/${FAILED_EMAILS.length} emails envoyés avec succès.`);

        return {
            success: true,
            message: "Envoi aux emails en échec terminé !",
            totalUsers: FAILED_EMAILS.length,
            totalSent: successCount,
            totalErrors: errorCount,
            errors: errors.length > 0 ? errors : undefined,
        };
    },
});

// =============================================================================
// ACTION : Envoyer l'annonce aux utilisateurs avec remainingGenerations === 1
// Ces utilisateurs n'ont pas encore utilisé leur génération gratuite
// =============================================================================
export const sendAnnouncementToUsersWithRemainingGeneration = action({
    args: {
        testMode: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        if (!RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY is not set. Add it in Convex Dashboard > Settings > Environment Variables");
        }

        const emails: string[] = await ctx.runQuery(internal.users.getEmailsWithRemainingGeneration, {});

        if (emails.length === 0) {
            return {
                success: false,
                message: "Aucun utilisateur avec remainingGenerations === 1 trouvé"
            };
        }

        if (args.testMode) {
            return {
                success: true,
                testMode: true,
                message: "Mode test - Voici les emails qui recevraient l'email :",
                emails: emails,
                totalUsers: emails.length,
            };
        }

        const SUBJECT = "Your Draftly credits have been reset 🔄";
        const BATCH_SIZE = 100;
        const DELAY_BETWEEN_BATCHES_MS = 1000;

        let successCount = 0;
        let errorCount = 0;
        const errors: Array<{ email: string; error: string }> = [];

        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        console.log(`📧 Envoi aux ${emails.length} utilisateurs avec remainingGenerations === 1...`);

        for (let i = 0; i < emails.length; i += BATCH_SIZE) {
            const batchEmails = emails.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(emails.length / BATCH_SIZE);

            console.log(`📦 Batch ${batchNumber}/${totalBatches}: Envoi de ${batchEmails.length} emails...`);

            const batchPayload = batchEmails.map((email) => ({
                from: "Draftly <noreply@draftly.live>",
                to: email,
                subject: SUBJECT,
                html: ANNOUNCEMENT_HTML,
                reply_to: "support@draftly.live",
                headers: {
                    "List-Unsubscribe": "<mailto:unsubscribe@draftly.live>",
                },
            }));

            try {
                const response = await fetch("https://api.resend.com/emails/batch", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + RESEND_API_KEY,
                    },
                    body: JSON.stringify(batchPayload),
                });

                const result = await response.json();

                if (!response.ok) {
                    console.error(`❌ Batch ${batchNumber} failed:`, result);
                    errorCount += batchEmails.length;
                    batchEmails.forEach((email) => {
                        errors.push({ email, error: JSON.stringify(result) });
                    });
                } else {
                    const successfulEmails = result.data?.length || 0;
                    const batchErrors = result.errors || [];

                    successCount += successfulEmails;

                    if (batchErrors.length > 0) {
                        batchErrors.forEach((err: { index: number; message: string }) => {
                            errorCount++;
                            errors.push({
                                email: batchEmails[err.index] || "unknown",
                                error: err.message,
                            });
                            console.error(`❌ Failed:`, batchEmails[err.index], err.message);
                        });
                    }

                    console.log(`✅ Batch ${batchNumber} terminé: ${successfulEmails} envoyés, ${batchErrors.length} erreurs`);
                }
            } catch (fetchError) {
                console.error(`❌ Batch ${batchNumber} network error:`, fetchError);
                errorCount += batchEmails.length;
                batchEmails.forEach((email) => {
                    errors.push({
                        email,
                        error: fetchError instanceof Error ? fetchError.message : "Network error",
                    });
                });
            }

            if (i + BATCH_SIZE < emails.length) {
                console.log(`⏳ Pause de ${DELAY_BETWEEN_BATCHES_MS}ms...`);
                await sleep(DELAY_BETWEEN_BATCHES_MS);
            }
        }

        console.log(`\n🎉 Envoi terminé! ${successCount}/${emails.length} emails envoyés avec succès.`);

        return {
            success: true,
            message: "Envoi aux utilisateurs avec remainingGenerations === 1 terminé !",
            totalUsers: emails.length,
            totalSent: successCount,
            totalErrors: errorCount,
            errors: errors.length > 0 ? errors : undefined,
        };
    },
});

// =============================================================================
// ACTION : Envoyer l'annonce aux emails qui ont échoué (quota dépassé - 20 décembre 2024)
// Liste des 313 emails qui n'ont pas reçu l'email à cause du quota Resend
// =============================================================================
export const sendAnnouncementToUsersWithRemainingGeneration2 = action({
    args: {
        testMode: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        if (!RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY is not set");
        }

        const FAILED_EMAILS = [
            "joshzga@gmail.com",
            "darkduoss@gmail.com",
            "qu3ntin.waguet@gmail.com",
            "whytwo10@gmail.com",
            "chris@naitive.cloud",
            "hherisson94@gmail.com",
            "djdjjdkddjdkeb@gmail.com",
            "latheore@gmail.com",
            "rahma.bouzaiani@gmail.com",
            "lucian.klaus@gmail.com",
            "azcnero@gmail.com",
            "mb98402074@gmail.com",
            "robillard.clement@gmail.com",
            "kev.aubree@gmail.com",
            "medhxtombx@gmail.com",
            "acfirpourautre@gmail.com",
            "alaakhaddioui123@gmail.com",
            "guillaume.yaici@devoteam.com",
            "briou69@gmail.com",
            "jules.rosat@getchef.fr",
            "bitnotbot@gmail.com",
            "aiautomationsecrets@gmail.com",
            "zaka7024@gmail.com",
            "powolnymarcel@gmail.com",
            "clement0bresson@gmail.com",
            "aymez.dev@gmail.com",
            "zaedza660@gmail.com",
            "maskoo.dev@gmail.com",
            "seydou91ba@gmail.com",
            "yacjne.dev@gmail.com",
            "contact.libertariens@gmail.com",
            "leaan.corentin@gmail.com",
            "ibinisti@gmail.com",
            "mafiagamingytbfr@gmail.com",
            "clashofclan77500@gmail.com",
            "mrdiarra17@gmail.com",
            "darkyvision49@gmail.com",
            "contactskiltest@gmail.com",
            "seifoone@gmail.com",
            "mballa.joa@gmail.com",
            "allansbrrr599@gmail.com",
            "guillaumedmns@gmail.com",
            "nino45230@gmail.com",
            "llbrun.pro@gmail.com",
            "martchar27@gmail.com",
            "cosytri@gmail.com",
            "lefrancois_louis@yahoo.fr",
            "alan@xenocode.co.jp",
            "heav3.mail@gmail.com",
            "imwhyyy.hyping@gmail.com",
            "sofsof340340@gmail.com",
            "heba.zeghadi@gmail.com",
            "laybats.victor@gmail.com",
            "ewone.minecraft@gmail.com",
            "ehyayaaa@gmail.com",
            "baptiste.nautre@hotmail.fr",
            "allansbr599@gmail.com",
            "mehdigououiad@gmail.com",
            "jelliti.mehdi@gmail.com",
            "slamadan23@gmail.com",
            "alichemoh1@gmail.com",
            "mrnoplugstv@gmail.com",
            "m3ct0n76@gmail.com",
            "fravertwitch@gmail.com",
            "vandug23@gmail.com",
            "deezerbart84@gmail.com",
            "adavidwarnar3@gmail.com",
            "izzarahmaaulia.ir49@gmail.com",
            "traderclubevn01@gmail.com",
            "deny.hrnt@gmail.com",
            "florijn@gmail.com",
            "hammadhzaryr08@gmail.com",
            "adityakpaypal@gmail.com",
            "pippicacca16@gmail.com",
            "nw.sandboxtest@gmail.com",
            "atworksafe@gmail.com",
            "dhaakon2@gmail.com",
            "misstalishawhite@gmail.com",
            "tyler.dooley@gmail.com",
            "yaffalsrp@gmail.com",
            "madametrouvaille.entreprise@gmail.com",
            "paulthorel1@gmail.com",
            "stevevaius@gmail.com",
            "bhavins7359@gmail.com",
            "oguzgurler@gmail.com",
            "cglryldrm.009@gmail.com",
            "bhavinsachaniya21@gmail.com",
            "jason.zhou.design@gmail.com",
            "hitsend6@gmail.com",
            "ronaeldat1@gmail.com",
            "dinesh.k@brilworks.com",
            "habbo.12gooon@gmail.com",
            "yaronattal2@gmail.com",
            "mecbien2022@gmail.com",
            "jtsherman02@gmail.com",
            "andrewjlyons@gmail.com",
            "earthshaper2030@gmail.com",
            "rjbaat@gmail.com",
            "realn0378@gmail.com",
            "ankamas.games.europe@gmail.com",
            "testeondeeuclico@gmail.com",
            "bamaodomalick7@gmail.com",
            "gummadivenkatakalyan@gmail.com",
            "tylerwicker52@yahoo.com",
            "sameerizwan3@gmail.com",
            "techspaceservices@gmail.com",
            "saudalmandhari8@gmail.com",
            "saif.hazeldesignstudio@gmail.com",
            "onkarskore@gmail.com",
            "bambadeividas@gmail.com",
            "princehabib1717@gmail.com",
            "ayushchandra51@gmail.com",
            "tau.hussainwork@gmail.com",
            "bigdp585@gmail.com",
            "droebiti@gmail.com",
            "connoraitools@gmail.com",
            "douglas.seger@gmail.com",
            "pokuri.vijay@gmail.com",
            "muhdbaqir@yahoo.com.sg",
            "dagimante101@gmail.com",
            "alex@diligentpixel.com",
            "notbananak@gmail.com",
            "theogrelet05@gmail.com",
            "jozet777@gmail.com",
            "bananaa123xd@gmail.com",
            "tonyqiu12345@gmail.com",
            "marc.pfeiler@gmail.com",
            "matthewrsutton01@gmail.com",
            "jr.boamah@gmail.com",
            "abraaozak@gmail.com",
            "dawood.privv.kips.22@gmail.com",
            "gregoire.neve@gmail.com",
            "rklf.contact@gmail.com",
            "sony.alexandre.vedrine@gmail.com",
            "susinisimone@gmail.com",
            "andreyesman@gmail.com",
            "hello.jiheme@gmail.com",
            "tobia.marconi@gmail.com",
            "marc1venturi@gmail.com",
            "hmzdrsn64@gmail.com",
            "kunsolpro@gmail.com",
            "frankb4435@gmail.com",
            "icalnurhidayat@gmail.com",
            "ridaelmouddene@gmail.com",
            "garrytestai@gmail.com",
            "yortem@gmail.com",
            "sudo@kames.me",
            "bojabzanaoufel@gmail.com",
            "jewdcage253@gmail.com",
            "judeokun@outlook.com",
            "vivekmishrasingh8@gmail.com",
            "maxluizz@gmail.com",
            "faisal@millennia21.id",
            "theonlyme79@gmail.com",
            "ninjamoonbaby@gmail.com",
            "pedrosalles00@gmail.com",
            "thenerdygamer83@gmail.com",
            "bo.overby@gmail.com",
            "kkiro37jap@gmail.com",
            "tcarson@cpiprint.com",
            "j4ckrp@gmail.com",
            "muhammedsherefmn@gmail.com",
            "echoukri@voice.ai",
            "victor.livera10@gmail.com",
            "sivakumar.sivalingam.2002@gmail.com",
            "ioannou.yiannis@gmail.com",
            "ahmadbasheerr@gmail.com",
            "tahaboudouma@gmail.com",
            "xfethiye@gmail.com",
            "halatre.quentin@gmail.com",
            "janmerijnversteeg@gmail.com",
            "enesatc331@gmail.com",
            "dilipraja06@gmail.com",
            "goubealexis@gmail.com",
            "hatejhn@gmail.com",
            "sam.gameing333@gmail.com",
            "santhos01ac@gmail.com",
            "q.mouraud@gmail.com",
            "anthonyminkowski@gmail.com",
            "calvinn5353@gmail.com",
            "jentilponey79@gmail.com",
            "chucknorrisjr911@gmail.com",
            "alice.boutet01@gmail.com",
            "maluhgouveia17@gmail.com",
            "hugosjsr@gmail.com",
            "kellyoconor@gmail.com",
            "shields.connor@gmail.com",
            "andreojules@gmail.com",
            "pubzyker@gmail.com",
            "a.ledesma@payxer.com",
            "enrique.mendoza@neovation.com",
            "lee@wrelik.com",
            "22burnerburner22@gmail.com",
            "shreyvijayvargiya26@gmail.com",
            "stevelamensdorf@gmail.com",
            "alston.albarado@gmail.com",
            "gestion77310@gmail.com",
            "felipe.nk.fnk@gmail.com",
            "mygrowthmagic@gmail.com",
            "sylvain@madeformed.com",
            "stuartxt@gmail.com",
            "tvmacieks@gmail.com",
            "designteam678@gmail.com",
            "youssefintn@gmail.com",
            "ulrik1996@gmail.com",
            "qiugunagun@gmail.com",
            "sgajera8505@gmail.com",
            "nicolehe7474@gmail.com",
            "kohlbyrdvlogs@gmail.com",
            "letslogothere@gmail.com",
            "ducna4@smartosc.com",
            "pranayamanikonda@gmail.com",
            "karimelhawary89@gmail.com",
            "19.habib.m@gmail.com",
            "gaosichun540@gmail.com",
            "mas@42zz.net",
            "readonnet@gmail.com",
            "thothomazo@gmail.com",
            "julien@anthm.fr",
            "devnooktutorials@gmail.com",
            "hnd1726@gmail.com",
            "yemveemail@gmail.com",
            "paypalcookiesvenere@gmail.com",
            "gzecheru@gmail.com",
            "vasantkr97@gmail.com",
            "jeremy@d0t.tech",
            "alcaann626@gmail.com",
            "jonaslismont928@gmail.com",
            "gauthier.guerin@gmail.com",
            "baptiste.paput@gmail.com",
            "barbozadominiquepierre@gmail.com",
            "abdrahaman.dev@gmail.com",
            "mzhabboub@gmail.com",
            "nassir452@gmail.com",
            "tlegalldutertre@gmail.com",
            "leseinjeanpaul@gmail.com",
            "feenix01999@gmail.com",
            "piloufournet@gmail.com",
            "robinpluviaux@gmail.com",
            "axelarsayepro@gmail.com",
            "julien@unlockt.me",
            "bissiriou100@gmail.com",
            "jainesh567@gmail.com",
            "maxime.desogus@gmail.com",
            "brunnathanpro@gmail.com",
            "karimajamil737@gmail.com",
            "fnajman@gmail.com",
            "sullivan.floricourt@gmail.com",
            "said.rassaby@leroidigital.com",
            "bizjakdevelop@gmail.com",
            "flemardl@gmail.com",
            "francoisdauzet@gmail.com",
            "lucescomel@gmail.com",
            "jean-didier.elisabeth@bnb.re",
            "morganes56@gmail.com",
            "arvin@opensesa.me",
            "aymanemwa@gmail.com",
            "taombeyanis@gmail.com",
            "nkfelipe4@gmail.com",
            "kiksprod@gmail.com",
            "kal10002020@gmail.com",
            "kat44426@gmail.com",
            "anthony.gonnet.42@gmail.com",
            "alexdubain@gmail.com",
            "richard.deguilhem@gmail.com",
            "bibizhang@gmail.com",
            "anastasiaburakova57@gmail.com",
            "r.campenon@getlocal.fr",
            "roy.gregoire00@gmail.com",
            "arcglobalgestion@gmail.com",
            "sindreandreassen57@gmail.com",
            "nassim.def@gmail.com",
            "g.colaiacomo@gmail.com",
            "rovelak@gmail.com",
            "snakebiz26@gmail.com",
            "vitortorresvt@gmail.com",
            "tristan.derez@gmail.com",
            "keropiboy@yahoo.com",
            "liamnichnich@gmail.com",
            "antoinesolermores@gmail.com",
            "apithymario.mashevo@gmail.com",
            "andrew@summerlawns.com",
            "eaygun176@gmail.com",
            "dennys.salioski@gmail.com",
            "flackoo.work@gmail.com",
            "webtest@agencekaractere.fr",
            "fx@dixnerclub.com",
            "ebakkal2@gmail.com",
            "nael.lippens@gmail.com",
            "veyretlouis@gmail.com",
            "elisep82@gmail.com",
            "mirko.pacitti@gmail.com",
            "hichemnkd@gmail.com",
            "ctprod41@gmail.com",
            "diazvargasod@gmail.com",
            "matt@hazard.house",
            "fidyrkt08@gmail.com",
            "karankalavadia97@gmail.com",
            "alinusr@gmail.com",
            "carsanilm@gmail.com",
            "mohamedeyaf820@gmail.com",
            "lemoineissac8@gmail.com",
            "mechwd@gmail.com",
            "yanis.hachemipro@gmail.com",
            "rahul.ijs87@gmail.com",
            "balint.egyed@voov.hu",
            "rausn222@gmail.com",
            "vixsup31@gmail.com",
            "maashein@gmail.com",
            "waylleenterprise@gmail.com",
            "hgudutkd@gmail.com",
            "windmaple1@gmail.com",
            "naveen.tr@zcocorporation.com",
        ];

        if (args.testMode) {
            return {
                success: true,
                testMode: true,
                message: "Mode test - Voici les emails qui recevraient l'email :",
                emails: FAILED_EMAILS,
                totalUsers: FAILED_EMAILS.length,
            };
        }

        const SUBJECT = "Your Draftly credits have been reset 🔄";
        const BATCH_SIZE = 100;
        const DELAY_BETWEEN_BATCHES_MS = 1000;

        let successCount = 0;
        let errorCount = 0;
        const errors: Array<{ email: string; error: string }> = [];

        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        console.log(`📧 Envoi aux ${FAILED_EMAILS.length} emails qui ont échoué le 20 décembre...`);

        for (let i = 0; i < FAILED_EMAILS.length; i += BATCH_SIZE) {
            const batchEmails = FAILED_EMAILS.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(FAILED_EMAILS.length / BATCH_SIZE);

            console.log(`📦 Batch ${batchNumber}/${totalBatches}: Envoi de ${batchEmails.length} emails...`);

            const batchPayload = batchEmails.map((email) => ({
                from: "Draftly <noreply@draftly.live>",
                to: email,
                subject: SUBJECT,
                html: ANNOUNCEMENT_HTML,
                reply_to: "support@draftly.live",
                headers: {
                    "List-Unsubscribe": "<mailto:unsubscribe@draftly.live>",
                },
            }));

            try {
                const response = await fetch("https://api.resend.com/emails/batch", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + RESEND_API_KEY,
                    },
                    body: JSON.stringify(batchPayload),
                });

                const result = await response.json();

                if (!response.ok) {
                    console.error(`❌ Batch ${batchNumber} failed:`, result);
                    errorCount += batchEmails.length;
                    batchEmails.forEach((email) => {
                        errors.push({ email, error: JSON.stringify(result) });
                    });
                } else {
                    const successfulEmails = result.data?.length || 0;
                    const batchErrors = result.errors || [];

                    successCount += successfulEmails;

                    if (batchErrors.length > 0) {
                        batchErrors.forEach((err: { index: number; message: string }) => {
                            errorCount++;
                            errors.push({
                                email: batchEmails[err.index] || "unknown",
                                error: err.message,
                            });
                            console.error(`❌ Failed:`, batchEmails[err.index], err.message);
                        });
                    }

                    console.log(`✅ Batch ${batchNumber} terminé: ${successfulEmails} envoyés, ${batchErrors.length} erreurs`);
                }
            } catch (fetchError) {
                console.error(`❌ Batch ${batchNumber} network error:`, fetchError);
                errorCount += batchEmails.length;
                batchEmails.forEach((email) => {
                    errors.push({
                        email,
                        error: fetchError instanceof Error ? fetchError.message : "Network error",
                    });
                });
            }

            if (i + BATCH_SIZE < FAILED_EMAILS.length) {
                console.log(`⏳ Pause de ${DELAY_BETWEEN_BATCHES_MS}ms...`);
                await sleep(DELAY_BETWEEN_BATCHES_MS);
            }
        }

        console.log(`\n🎉 Envoi terminé! ${successCount}/${FAILED_EMAILS.length} emails envoyés avec succès.`);

        return {
            success: true,
            message: "Envoi aux emails en échec (20 décembre) terminé !",
            totalUsers: FAILED_EMAILS.length,
            totalSent: successCount,
            totalErrors: errorCount,
            errors: errors.length > 0 ? errors : undefined,
        };
    },
});

// =============================================================================
// ACTION : Envoyer un email de test
// =============================================================================
export const sendTestEmail = action({
    args: {
        to: v.string(),
    },
    handler: async (ctx, args) => {
        const RESEND_API_KEY = process.env.RESEND_API_KEY;

        if (!RESEND_API_KEY) {
            throw new Error("RESEND_API_KEY is not set");
        }

        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + RESEND_API_KEY,
            },
            body: JSON.stringify({
                from: "Draftly <noreply@draftly.live>",
                to: args.to,
                subject: "[TEST] Your Draftly credits have been reset 🔄",
                html: ANNOUNCEMENT_HTML,
                reply_to: "support@draftly.live",
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error("Failed: " + JSON.stringify(data));
        }

        return { success: true, id: data.id, message: "Test email sent to " + args.to };
    },
});
