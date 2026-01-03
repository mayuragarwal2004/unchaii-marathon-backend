
import { PrismaClient, type User } from '@prisma/client'
import { v2 as cloudinary } from 'cloudinary'
import { createCanvas, loadImage, type CanvasRenderingContext2D } from '@napi-rs/canvas'
import QRCode from 'qrcode'
import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import * as dotenv from 'dotenv'

dotenv.config()

const prisma = new PrismaClient()

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Pass dimensions (mobile-optimized)
const PASS_WIDTH = 450
const PASS_HEIGHT = 800

// Colors matching frontend
const COLORS = {
    background: '#0c0a09',      // stone-950
    cardBg: '#1c1917',          // stone-900
    amber: '#f59e0b',           // amber-500
    amberLight: '#fcd34d',      // amber-300
    white: '#ffffff',
    greenBanner: '#16a34a',     // green-600
    textMuted: '#a8a29e',       // stone-400
    border: 'rgba(245, 158, 11, 0.2)'
}

/**
 * Helper to draw rounded rectangles
 */
function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
) {
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
}

async function generatePassImage(user: User): Promise<Buffer> {
    const canvas = createCanvas(PASS_WIDTH, PASS_HEIGHT)
    const ctx = canvas.getContext('2d')

    // Background
    ctx.fillStyle = COLORS.background
    ctx.fillRect(0, 0, PASS_WIDTH, PASS_HEIGHT)

    // Card with rounded corners and border
    const cardX = 20
    const cardY = 20
    const cardWidth = PASS_WIDTH - 40
    const cardHeight = PASS_HEIGHT - 40
    const cornerRadius = 24

    // Card background
    ctx.fillStyle = COLORS.cardBg
    roundRect(ctx, cardX, cardY, cardWidth, cardHeight, cornerRadius)
    ctx.fill()

    // Card border
    ctx.strokeStyle = COLORS.amber
    ctx.lineWidth = 2
    roundRect(ctx, cardX, cardY, cardWidth, cardHeight, cornerRadius)
    ctx.stroke()

    // Status Banner (with clipping for rounded corners)
    const bannerHeight = 40
    ctx.save()
    roundRect(ctx, cardX, cardY, cardWidth, cardHeight, cornerRadius)
    ctx.clip()
    ctx.fillStyle = COLORS.greenBanner
    ctx.fillRect(cardX, cardY, cardWidth, bannerHeight)
    ctx.restore()

    // Banner text
    ctx.fillStyle = COLORS.white
    ctx.font = 'bold 12px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('REGISTRATION CONFIRMED', PASS_WIDTH / 2, cardY + 26)

    // Header section
    const headerY = cardY + bannerHeight + 20
    ctx.fillStyle = COLORS.amber
    ctx.font = 'bold 28px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('UNCHAAI', PASS_WIDTH / 2, headerY + 30)

    ctx.font = 'bold 20px Arial'
    ctx.fillText('MARATHON 2026', PASS_WIDTH / 2, headerY + 55)

    // --- Bib & T-Shirt Section ---
    const infoY = headerY + 90

    // Separator line
    ctx.strokeStyle = COLORS.border
    ctx.beginPath()
    ctx.moveTo(cardX + 40, headerY + 70)
    ctx.lineTo(cardX + cardWidth - 40, headerY + 70)
    ctx.stroke()

    // Bib Number (Left)
    ctx.fillStyle = COLORS.textMuted
    ctx.font = 'bold 16px Arial' // Increased label size
    ctx.fillText('BIB NUMBER', PASS_WIDTH / 2 - 90, infoY)

    ctx.fillStyle = COLORS.white
    ctx.font = 'bold 75px Arial' // Doubled size
    ctx.fillText(user.bibNum || '-', PASS_WIDTH / 2 - 90, infoY + 65)

    // T-Shirt (Right)
    ctx.fillStyle = COLORS.textMuted
    ctx.font = 'bold 16px Arial' // Increased label size
    ctx.fillText('COUNTER NUM', PASS_WIDTH / 2 + 90, infoY)

    ctx.fillStyle = COLORS.amber
    ctx.font = 'bold 75px Arial'
    ctx.fillText(user.counterNo || '-', PASS_WIDTH / 2 + 90, infoY + 65)


    // --- QR Code ---
    // Increased size and prominent placement
    const qrSize = 250 // Kept large size
    const qrY = infoY + 110 // Pushed down to accommodate huge Bib number
    const qrX = (PASS_WIDTH - qrSize) / 2

    try {
        const qrDataUrl = await QRCode.toDataURL(user.id, {
            width: qrSize,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        })

        const qrImage = await loadImage(qrDataUrl)

        // QR background container
        ctx.fillStyle = COLORS.white
        roundRect(ctx, qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 16)
        ctx.fill()

        // QR code
        ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize)
    } catch (error) {
        console.error('Failed to generate QR code', error)
    }

    // --- User Details (Bottom) ---
    const detailsY = qrY + qrSize + 55 // Increased gap

    // Name
    ctx.fillStyle = COLORS.white
    ctx.font = 'bold 32px Arial' // Increased size
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
    ctx.fillText(fullName, PASS_WIDTH / 2, detailsY)

    // Category / Distance & T-Shirt Table
    const tableY = detailsY + 35
    const colWidth = 100
    // const centerX = PASS_WIDTH / 2 // Already available implicitly

    // Left Column: KM
    const kmValue = user.distance?.toLowerCase().replace('km', '').trim() || 'N/A'

    ctx.fillStyle = COLORS.textMuted
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    // ctx.fillText('KM', PASS_WIDTH / 2 - 60, tableY) // Label
    ctx.fillText('KM', PASS_WIDTH / 2 - colWidth / 2 - 20, tableY) // Shifted left

    ctx.fillStyle = COLORS.amber
    ctx.font = 'bold 42px Arial'
    // ctx.fillText(kmValue, PASS_WIDTH / 2 - 60, tableY + 40) // Value
    ctx.fillText(kmValue, PASS_WIDTH / 2 - colWidth / 2 - 20, tableY + 40)

    // Right Column: T-Shirt
    const tshirtValue = user.tshirtSize?.split(' - ')[0] || 'N/A'

    ctx.fillStyle = COLORS.textMuted
    ctx.font = 'bold 16px Arial'
    // ctx.fillText('T-SHIRT', PASS_WIDTH / 2 + 60, tableY) // Label
    ctx.fillText('T-SHIRT', PASS_WIDTH / 2 + colWidth / 2 + 20, tableY) // Shifted right

    ctx.fillStyle = COLORS.amber
    ctx.font = 'bold 42px Arial'
    // ctx.fillText(tshirtValue, PASS_WIDTH / 2 + 60, tableY + 40) // Value
    ctx.fillText(tshirtValue, PASS_WIDTH / 2 + colWidth / 2 + 20, tableY + 40)

    // Age & Gender
    ctx.fillStyle = COLORS.textMuted
    ctx.font = '18px Arial' // Increased size
    const detailsText = `${user.gender?.toUpperCase() || ''}  •  AGE ${user.age || 'N/A'}`
    ctx.fillText(detailsText, PASS_WIDTH / 2, detailsY + 105)

    // Footer (with clipping for rounded corners)
    const footerY = PASS_HEIGHT - 60
    ctx.save()
    roundRect(ctx, cardX, cardY, cardWidth, cardHeight, cornerRadius)
    ctx.clip()
    ctx.fillStyle = COLORS.amber
    ctx.fillRect(cardX, footerY, cardWidth, 40)
    ctx.restore()

    ctx.fillStyle = COLORS.white
    ctx.font = 'bold 16px Arial' // Increased size
    const location = 'Pune University'
    ctx.fillText(location, PASS_WIDTH / 2, footerY - 10)

    ctx.fillStyle = COLORS.background
    ctx.font = 'bold 14px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('#BHAGO', PASS_WIDTH / 2, footerY + 26)

    return canvas.toBuffer('image/png')
}

async function uploadToCloudinary(buffer: Buffer, filename: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'unchai-marathon/passes',
                public_id: filename,
                resource_type: 'image'
            },
            (error, result) => {
                if (error) return reject(error)
                if (result) return resolve(result.secure_url)
                reject(new Error('Upload failed'))
            }
        )
        uploadStream.end(buffer)
    })
}

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
    console.log('\n--- Unchaai Marathon Pass Generator ---\n')
    console.log('Select a mode:')
    console.log('1. Generate for ALL pending users')
    console.log('2. Generate for list of IDs from CSV')
    console.log('3. Local Test (Single User, No Upload)')

    const choice = await askQuestion('\nEnter choice (1-3): ')

    if (choice === '1') {
        // --- Mode 1: All Pending ---
        console.log('\nStarting pass generation for all pending users...')
        const users = await prisma.user.findMany({
            where: { passLink: null }
        })

        console.log(`Found ${users.length} users needing passes.`)
        await processUsers(users)

    } else if (choice === '2') {
        // --- Mode 2: CSV List ---
        const csvPath = await askQuestion('Enter path to CSV key file: ')
        const absolutePath = path.resolve(csvPath.trim())

        if (!fs.existsSync(absolutePath)) {
            console.error('File not found:', absolutePath)
            return
        }

        const fileContent = fs.readFileSync(absolutePath, 'utf-8')
        // Assume simple list of IDs, one per line or comma separated
        const ids = fileContent.split(/[\n,]/).map(s => s.trim()).filter(Boolean)

        if (ids.length === 0) {
            console.error('No IDs found in file.')
            return
        }

        console.log(`Found ${ids.length} IDs to process...`)
        const users = await prisma.user.findMany({
            where: { id: { in: ids } }
        })
        console.log(`Matched ${users.length} users in database.`)

        await processUsers(users)

    } else if (choice === '3') {
        // --- Mode 3: Local Test ---
        const userId = await askQuestion('Enter User ID to test: ')
        const user = await prisma.user.findUnique({
            where: { id: userId.trim() }
        })

        if (!user) {
            console.error('User not found in database.')
            return
        }

        console.log(`Generating test pass for ${user.firstName}...`)
        const buffer = await generatePassImage(user)
        const outputPath = path.join(process.cwd(), `test-pass-${user.id}.png`)
        fs.writeFileSync(outputPath, buffer)
        console.log(`\nSuccess! Valid pass generated at: ${outputPath}`)

    } else {
        console.log('Invalid choice.')
    }

    console.log('\nDone!')
}

async function processUsers(users: User[]) {
    for (const user of users) {
        try {
            console.log(`Processing ${user.firstName} ${user.lastName}...`)
            const buffer = await generatePassImage(user)
            const url = await uploadToCloudinary(buffer, `pass-${user.id}`)

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    passLink: url
                }
            })
            console.log(`Updated pass for ${user.id}: ${url}`)
        } catch (error) {
            console.error(`Failed to process user ${user.id}:`, error)
        }
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
