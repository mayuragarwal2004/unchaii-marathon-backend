import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sign } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { phoneNumber, otp } = body;

        if (!phoneNumber || !otp) {
            return NextResponse.json({ success: false, error: 'Phone number and OTP are required' }, { status: 400 });
        }

        const record = await prisma.otp.findUnique({
            where: { phoneNumber }
        });

        if (!record) {
            return NextResponse.json({ success: false, error: 'OTP not found or expired' }, { status: 400 });
        }

        if (record.code !== otp) {
            return NextResponse.json({ success: false, error: 'Invalid OTP' }, { status: 400 });
        }

        if (new Date() > record.expiresAt) {
            return NextResponse.json({ success: false, error: 'OTP expired' }, { status: 400 });
        }

        // OTP is valid
        // Optionally delete the OTP record after successful verification to prevent reuse
        await prisma.otp.delete({ where: { phoneNumber } });

        // Generate JWT
        const token = sign({ phoneNumber }, JWT_SECRET, { expiresIn: '7d' });

        return NextResponse.json({ success: true, message: 'OTP verified successfully', token });

    } catch (error) {
        console.error('Verify OTP error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}
