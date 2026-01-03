
import { PrismaClient, type User } from '@prisma/client'
import * as dotenv from 'dotenv'
import * as readline from 'readline'
import { sendWhatsAppMessageByDovesoft } from '../lib/whatsapp'

dotenv.config()

const prisma = new PrismaClient()

function askQuestion(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

async function main() {
    const args = process.argv.slice(2);
    const isDryRun = !args.includes('--send');
    const testArg = args.find(arg => arg.startsWith('--test='));
    const testNumbers = testArg ? testArg.split('=')[1].split(',').map(n => n.trim()) : [];

    console.log('\n--- Unchaai Marathon Ticket Confirmation Sender ---\n')

    if (isDryRun) {
        console.log('DRY RUN MODE: No messages will be sent.\n')
    }

    let targetUsers: User[] = [];

    if (testNumbers.length > 0) {
        console.log(`Test mode enabled. Searching for users with numbers: ${testNumbers.join(', ')}`)

        for (const num of testNumbers) {
            const foundUsers = await prisma.user.findMany({
                where: {
                    phoneNumber: {
                        contains: num.replace(/^\+91/, '').replace(/^91/, '') // Search for the digits
                    }
                }
            });

            if (foundUsers.length === 0) {
                console.warn(`⚠️  No users found in database for number: ${num}`)
            } else {
                console.log(`Found ${foundUsers.length} records for ${num}`)
                targetUsers.push(...foundUsers);
            }
        }

        if (targetUsers.length === 0) {
            console.error('No users found to test with.')
            return;
        }
    } else {
        console.log('Fetching all registered users...')
        targetUsers = await prisma.user.findMany();

        console.log(`Found ${targetUsers.length} users.`)

        if (targetUsers.length === 0) {
            console.log('No users found to send messages to.')
            return;
        }

        if (!isDryRun) {
            const confirm = await askQuestion(`Are you sure you want to send messages to ${targetUsers.length} users? (yes/any other key to exit): `)
            if (confirm.toLowerCase() !== 'yes') {
                console.log('Aborted.')
                return;
            }
        }
    }

    console.log(`\nProcessing ${targetUsers.length} messages...\n`)

    let successCount = 0;
    let failCount = 0;

    for (const user of targetUsers) {
        const payload = {
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            category: user.distance || 'Marathon',
            bibNumber: user.bibNum || 'N/A',
            counter: user.counterNo || 'N/A',
            passLink: user.passLink
        };

        if (isDryRun) {
            console.log(`[DRY RUN] Would send to ${user.phoneNumber}:`, payload)
            successCount++;
        } else {
            process.stdout.write(`Sending to ${user.phoneNumber} (${payload.name})... `);
            const result = await sendWhatsAppMessageByDovesoft('ticket_confirmation', user.phoneNumber, payload);
            if (result.ok) {
                console.log('✅ Sent');
                successCount++;
            } else {
                console.log(`❌ Failed: ${result.message}`);
                failCount++;
            }
            // Small delay to avoid hitting rate limits too hard if any
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    console.log(`\n--- Summary ---`)
    console.log(`Total: ${targetUsers.length}`)
    console.log(`Success: ${successCount}`)
    console.log(`Failed: ${failCount}`)
    if (isDryRun) console.log('Note: This was a DRY RUN.')
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
