import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { verifyToken } from "@/lib/auth";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);

        // Ensure decoded token has the admin ID (assuming it's 'id' based on typical usage)
        if (!decoded || typeof decoded === 'string' || !decoded.id) {
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        // Just to be sure, we can verify the admin exists in DB if critical,
        // but for logging strictly, checking token validity is usually enough for "who performed this".
        // Let's trust the token 'id' is the adminId.

        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ success: false, message: "User ID is required" }, { status: 400 });
        }

        const scanLog = await prisma.scanLog.create({
            data: {
                userId,
                adminId: decoded.id,
            },
        });

        return NextResponse.json({ success: true, log: scanLog });
    } catch (error) {
        console.error("Error logging scan:", error);
        return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
    }
}
