import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Pendaftaran mandiri dinonaktifkan. Pembuatan akun baru hanya dapat dilakukan oleh Administrator.",
    },
    { status: 403 }
  );
}
