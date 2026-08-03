import { NextResponse } from 'next/server';

export async function POST(request) {
  const body = await request.json();
  const {
    to, customerName, salonName, serviceName, date, time,
    staffName, confirmationCode, depositAmount, balanceDue, depositPaid,
  } = body;

  if (!to || !to.includes('@')) {
    return NextResponse.json({ skipped: true });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Email not configured' }, { status: 200 });
  }

  const html = `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #F5F0E6; color:#262019;">
      <p style="font-style: italic; font-size: 18px; color:#1E2F27; margin-bottom: 4px;">${salonName}</p>
      <h1 style="font-size: 22px; margin: 0 0 12px;">You're all set, ${customerName}</h1>
      <div style="background:#fff; border:1px solid #DCD1B9; border-radius:12px; padding:16px 20px; margin-bottom:12px;">
        <p style="margin:0; font-weight:600;">${serviceName}</p>
        <p style="margin:4px 0; color:#666; font-size:14px;">${date} · ${time}</p>
        <p style="margin:4px 0; color:#666; font-size:14px;">with ${staffName || 'our team'}</p>
        <p style="margin:8px 0 0; font-family: monospace; font-size:12px; color:#999;">${confirmationCode}</p>
      </div>
      <div style="background:#fff; border:1px solid #DCD1B9; border-radius:12px; padding:16px 20px;">
        ${depositPaid
          ? `<p style="margin:0;">Deposit paid: <strong>${depositAmount}</strong></p><p style="margin:4px 0 0; color:#666; font-size:13px;">Balance due at appointment: ${balanceDue}</p>`
          : `<p style="margin:0;">Due at appointment: <strong>${balanceDue}</strong></p>`
        }
      </div>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Chair Time <onboarding@resend.dev>',
      to: [to],
      subject: `You're booked at ${salonName}`,
      html,
    }),
  });

  if (!res.ok) {
    console.error('Resend error:', await res.text());
    return NextResponse.json({ error: 'Failed to send' }, { status: 200 });
  }

  return NextResponse.json({ sent: true });
}
