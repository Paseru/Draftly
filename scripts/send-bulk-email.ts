/**
 * Script pour envoyer des emails en masse via Resend
 * 
 * Usage:
 * 1. Configure les variables d'environnement dans .env.local
 * 2. npx ts-node scripts/send-bulk-email.ts
 * 
 * IMPORTANT: Teste toujours en mode test avant d'envoyer en production!
 */

import "dotenv/config";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import * as fs from "fs";
import * as path from "path";

// Configuration
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;

// Paramètres d'envoi
const BATCH_SIZE = 10;      // Emails par lot
const DELAY_MS = 2000;      // Délai entre les lots (2 secondes)
const TEST_MODE = true;     // METTRE À FALSE POUR ENVOYER EN PRODUCTION
const TEST_EMAIL = "ton-email@gmail.com";  // Email pour le test

// Email à envoyer
const SUBJECT = "We've Fixed It All. Seriously. 🚀";
const HTML_FILE = path.join(__dirname, "../emails/announcement.html");

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendEmail(to: string, subject: string, html: string) {
    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
            from: "Draftly <noreply@draftly.app>",
            to,
            subject,
            html,
            reply_to: "support@draftly.app",
            headers: {
                "List-Unsubscribe": "<mailto:unsubscribe@draftly.app>",
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
        }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to send to ${to}: ${JSON.stringify(error)}`);
    }

    return await response.json();
}

async function main() {
    console.log("🚀 Bulk Email Sender for Draftly\n");

    // Vérifications
    if (!CONVEX_URL) {
        throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
    }
    if (!RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is not set");
    }

    // Charger le HTML
    const html = fs.readFileSync(HTML_FILE, "utf-8");
    console.log(`📄 Loaded email template: ${HTML_FILE}`);

    if (TEST_MODE) {
        console.log(`\n🧪 TEST MODE: Sending only to ${TEST_EMAIL}\n`);

        try {
            const result = await sendEmail(TEST_EMAIL, `[TEST] ${SUBJECT}`, html);
            console.log(`✅ Test email sent! ID: ${result.id}`);
            console.log("\n⚠️  Check your inbox (and spam folder) before sending to all users.");
            console.log("    Set TEST_MODE = false when ready to send to everyone.");
        } catch (error) {
            console.error("❌ Failed to send test email:", error);
        }
        return;
    }

    // Mode production
    console.log("\n⚠️  PRODUCTION MODE: Sending to all users!\n");

    // Connexion à Convex
    const client = new ConvexHttpClient(CONVEX_URL);

    // Note: getAllUsersWithEmail est une internalQuery, donc on ne peut pas l'appeler directement
    // Tu devras créer une query publique ou utiliser le Dashboard Convex pour exporter les emails

    console.log("❌ Production mode requires exporting users from Convex Dashboard.");
    console.log("   Go to: https://dashboard.convex.dev → Your Project → Data → users");
    console.log("   Export emails and update this script with the list.");

    // Exemple avec une liste d'emails statique:
    // const emails = ["user1@example.com", "user2@example.com"];
    // 
    // let successCount = 0;
    // let errorCount = 0;
    // 
    // for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    //     const batch = emails.slice(i, i + BATCH_SIZE);
    //     console.log(`\n📤 Sending batch ${Math.floor(i / BATCH_SIZE) + 1}...`);
    //     
    //     for (const email of batch) {
    //         try {
    //             await sendEmail(email, SUBJECT, html);
    //             successCount++;
    //             console.log(`  ✅ Sent to ${email}`);
    //         } catch (error) {
    //             errorCount++;
    //             console.error(`  ❌ Failed: ${email}`, error);
    //         }
    //     }
    //     
    //     // Délai entre les lots
    //     if (i + BATCH_SIZE < emails.length) {
    //         console.log(`  ⏳ Waiting ${DELAY_MS}ms...`);
    //         await sleep(DELAY_MS);
    //     }
    // }
    // 
    // console.log(`\n✅ Done! Sent: ${successCount}, Failed: ${errorCount}`);
}

main().catch(console.error);
