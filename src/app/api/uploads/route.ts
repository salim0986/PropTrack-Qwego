import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(req: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ message: "No file provided" }, { status: 400 });
        }

        // Client-side + server-side validation
        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { message: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
                { status: 400 }
            );
        }

        if (file.size > MAX_SIZE_BYTES) {
            return NextResponse.json(
                { message: "File too large. Maximum size is 5MB." },
                { status: 400 }
            );
        }

        // Initialize Supabase client with service role key (for storage writes)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        const ext = file.type.split("/")[1];
        const filename = `tickets/${session.user.id}/${Date.now()}.${ext}`;

        const { error } = await supabase.storage
            .from("proptrack")
            .upload(filename, buffer, {
                contentType: file.type,
                upsert: false,
            });

        if (error) {
            console.error("Supabase upload error:", error);
            return NextResponse.json({ message: "Upload failed. Please try again." }, { status: 500 });
        }

        const { data: { publicUrl } } = supabase.storage
            .from("proptrack")
            .getPublicUrl(filename);

        return NextResponse.json({ url: publicUrl }, { status: 201 });

    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
