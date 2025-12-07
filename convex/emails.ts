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
        const BATCH_SIZE = 10;
        const DELAY_MS = 1000;

        let successCount = 0;
        let errorCount = 0;
        const errors: Array<{ email: string; error: string }> = [];

        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        for (let i = 0; i < emails.length; i += BATCH_SIZE) {
            const batch = emails.slice(i, i + BATCH_SIZE);

            const results = await Promise.allSettled(
                batch.map(async (email) => {
                    const response = await fetch("https://api.resend.com/emails", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": "Bearer " + RESEND_API_KEY,
                        },
                        body: JSON.stringify({
                            from: "Draftly <noreply@draftly.live>",
                            to: email,
                            subject: SUBJECT,
                            html: ANNOUNCEMENT_HTML,
                            reply_to: "support@draftly.live",
                            headers: {
                                "List-Unsubscribe": "<mailto:unsubscribe@draftly.live>",
                            },
                        }),
                    });

                    if (!response.ok) {
                        const error = await response.json();
                        throw new Error(JSON.stringify(error));
                    }

                    return email;
                })
            );

            for (let j = 0; j < results.length; j++) {
                const result = results[j];
                if (result.status === "fulfilled") {
                    successCount++;
                    console.log("✅ Sent to:", result.value);
                } else {
                    errorCount++;
                    errors.push({
                        email: batch[j],
                        error: result.reason?.message || "Unknown error",
                    });
                    console.error("❌ Failed:", batch[j]);
                }
            }

            if (i + BATCH_SIZE < emails.length) {
                await sleep(DELAY_MS);
            }
        }

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
