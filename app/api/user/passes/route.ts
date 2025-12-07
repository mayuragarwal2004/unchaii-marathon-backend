import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { verify, JwtPayload } from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("Authorization");
        const token = authHeader?.split(" ")[1]; // Bearer <token>

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let phoneNumber: string;
        try {
            const decoded = verify(token, JWT_SECRET) as JwtPayload;
            phoneNumber = decoded.phoneNumber;
        } catch (err) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        if (!phoneNumber) {
            return NextResponse.json({ error: "Invalid token payload" }, { status: 401 });
        }

        const users = await prisma.user.findMany({
            where: {
                phoneNumber: phoneNumber,
            },
            orderBy: {
                firstName: "asc",
            },
        });

        return NextResponse.json({ success: true, passes: users });
    } catch (error) {
        console.error("Error fetching passes:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
