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
