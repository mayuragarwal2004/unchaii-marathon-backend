import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    // Auth check
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                firstName: true,
                middleName: true,
                lastName: true,
                email: true,
                gotra: true,
                gender: true,
                age: true,
                phoneNumber: true,
                tshirtSize: true,
                distance: true,
                isBibGiven: true,
                isTshirtGiven: true,
                bibNum: true,
            }
        });
        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, user });
    } catch {
        return NextResponse.json({ success: false, error: 'Failed to fetch user' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    // Auth check
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();

        // Only allow specific fields to be updated for security and optimization
        const allowedUpdates = ['isBibGiven', 'isTshirtGiven', 'bibNum'];
        const updateData: Partial<Prisma.UserGetPayload<object>> = {};

        Object.keys(body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                (updateData as any)[key] = body[key];
            }
        });

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ success: false, error: 'No valid update fields provided' }, { status: 400 });
        }

        const user = await prisma.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true,
                isBibGiven: true,
                isTshirtGiven: true,
                bibNum: true,
            }
        });
        return NextResponse.json({ success: true, user });
    } catch (error) {
        console.error('Update error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update user' }, { status: 500 });
    }
}
