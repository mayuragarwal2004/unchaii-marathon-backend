import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 6);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            firstName, middleName, lastName, email, phoneNumber, gender, gotra, birthdate, age, bloodGroup,
            emergencyContactName, emergencyContactRelation, emergencyContactPhone,
            distance, tshirtSize,
            medicalConditions, medications, allergies,
            acceptedDeclaration
        } = body;

        // Check for duplicate entry (same name + phone)
        const duplicateUser = await prisma.user.findFirst({
            where: {
                firstName: { equals: firstName, mode: 'insensitive' },
                lastName: { equals: lastName, mode: 'insensitive' },
                phoneNumber: phoneNumber
            },
            select: { id: true }
        });

        if (duplicateUser) {
            return NextResponse.json({
                success: false,
                error: 'A participant with this name and phone number is already registered.'
            }, { status: 409 });
        }

        // Ensure unique ID (though collision probability is low for 6 chars, it's non-zero)
        let id = nanoid();
        let exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
        while (exists) {
            id = nanoid();
            exists = await prisma.user.findUnique({ where: { id }, select: { id: true } });
        }

        const user = await prisma.user.create({
            data: {
                id,
                firstName,
                middleName,
                lastName,
                email,
                phoneNumber,
                gender,
                gotra,
                birthdate: new Date(birthdate),
                age: parseInt(age),
                bloodGroup,
                emergencyContactName,
                emergencyContactRelation,
                emergencyContactPhone,
                distance,
                tshirtSize,
                medicalConditions,
                medications,
                allergies,
                acceptedDeclaration,
            },
        });

        return NextResponse.json({ success: true, user });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ success: false, error: 'Registration failed' }, { status: 500 });
    }
}
