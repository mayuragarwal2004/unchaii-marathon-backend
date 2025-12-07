
import { NextResponse } from "next/server";
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get("Authorization");
        const token = authHeader?.split(" ")[1];

        if (!token) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }

        try {
            verify(token, JWT_SECRET);
            return NextResponse.json({ authenticated: true });
        } catch (err) {
            return NextResponse.json({ authenticated: false }, { status: 401 });
        }
    } catch (error) {
        return NextResponse.json({ authenticated: false }, { status: 500 });
    }
}
