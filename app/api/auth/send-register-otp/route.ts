import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWhatsAppMessageByDovesoft } from '@/lib/whatsapp';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { phoneNumber } = body;

        if (!phoneNumber) {
            return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

        // Upsert OTP in database
        await prisma.otp.upsert({
            where: { phoneNumber },
            update: { code: otp, expiresAt },
            create: { phoneNumber, code: otp, expiresAt }
        });

        // Send OTP via WhatsApp
        const result = await sendWhatsAppMessageByDovesoft('otp', phoneNumber, { otp });

        if (result.ok) {
            return NextResponse.json({ success: true, message: 'OTP sent successfully' });
        } else {
            return NextResponse.json({ success: false, error: 'Failed to send OTP via WhatsApp' }, { status: 500 });
        }

    } catch (error) {
        console.error('Send Register OTP error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
