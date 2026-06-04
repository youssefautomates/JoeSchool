import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { email, password, rememberMe } = await request.json();

    const validEmail = process.env.ADMIN_EMAIL || 'admin@joeschool.com';
    const validPassword = process.env.ADMIN_PASSWORD || '@Youssefmostafa26';

    if (email === validEmail && password === validPassword) {
      // Set HTTP-only cookie for secure session management
      const cookieStore = await cookies();
      const maxAge = rememberMe ? 60 * 60 * 24 * 30 : undefined; // 30 days if checked, else session cookie

      cookieStore.set('admin_token', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: maxAge,
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
