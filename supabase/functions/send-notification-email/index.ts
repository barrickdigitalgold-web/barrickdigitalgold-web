import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationEmailRequest {
  to: string;
  subject: string;
  type: 'withdrawal' | 'transaction' | 'gold_purchase' | 'gold_sale' | 'investment' | 'topup_submitted' | 'wallet_transfer';
  status: string;
  amount?: number;
  message?: string;
  username?: string;
  goldAmount?: number;
  lockPeriod?: number;
  planName?: string;
  totalReturns?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, type, status, amount, message, username, goldAmount, lockPeriod, planName, totalReturns }: NotificationEmailRequest = await req.json();

    console.log(`Sending ${type} notification email to ${to}`);

    let htmlContent = '';
    
    if (type === 'withdrawal') {
      const statusColor = status === 'approved' ? '#10b981' : status === 'declined' ? '#ef4444' : '#f59e0b';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #D4AF37;">Withdrawal Request Update</h1>
          <p>Hello ${username || 'User'},</p>
          <p>Your withdrawal request has been <strong style="color: ${statusColor};">${status}</strong>.</p>
          ${amount ? `<p><strong>Amount:</strong> ${amount}</p>` : ''}
          ${message ? `<div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0;"><strong>Admin Message:</strong></p><p style="margin: 10px 0 0;">${message}</p></div>` : ''}
          <p>Thank you for using our platform!</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated email. Please do not reply to this message.</p>
        </div>
      `;
    } else if (type === 'transaction') {
      const statusColor = status === 'approved' ? '#10b981' : status === 'rejected' ? '#ef4444' : '#f59e0b';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #D4AF37;">Top-Up Transaction Update</h1>
          <p>Hello ${username || 'User'},</p>
          <p>Your top-up transaction has been <strong style="color: ${statusColor};">${status}</strong>.</p>
          ${amount ? `<p><strong>Amount:</strong> ${amount}</p>` : ''}
          ${message ? `<div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;"><p style="margin: 0;"><strong>Admin Notes:</strong></p><p style="margin: 10px 0 0;">${message}</p></div>` : ''}
          <p>Thank you for using our platform!</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated email. Please do not reply to this message.</p>
        </div>
      `;
    } else if (type === 'gold_purchase') {
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #D4AF37;">Gold Purchase Confirmation</h1>
          <p>Hello ${username || 'User'},</p>
          <p>Your gold purchase has been <strong style="color: #10b981;">completed successfully</strong>!</p>
          <div style="background: linear-gradient(135deg, #D4AF37 0%, #F5E6C8 100%); padding: 20px; border-radius: 8px; margin: 20px 0; color: #1a1a1a;">
            <p style="margin: 5px 0;"><strong>Gold Amount:</strong> ${goldAmount}g</p>
            <p style="margin: 5px 0;"><strong>Total Cost:</strong> ${amount}</p>
            <p style="margin: 5px 0;"><strong>Lock Period:</strong> ${lockPeriod} days</p>
          </div>
          <p>Your gold is now locked and will mature after the lock period ends.</p>
          <p>Thank you for investing with us!</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated email. Please do not reply to this message.</p>
        </div>
      `;
    } else if (type === 'gold_sale') {
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #D4AF37;">Gold Sale Confirmation</h1>
          <p>Hello ${username || 'User'},</p>
          <p>Your gold sale has been <strong style="color: #10b981;">completed successfully</strong>!</p>
          <div style="background: linear-gradient(135deg, #D4AF37 0%, #F5E6C8 100%); padding: 20px; border-radius: 8px; margin: 20px 0; color: #1a1a1a;">
            <p style="margin: 5px 0;"><strong>Gold Sold:</strong> ${goldAmount}g</p>
            <p style="margin: 5px 0;"><strong>Amount Received:</strong> ${amount}</p>
          </div>
          <p>The funds have been added to your withdrawable balance.</p>
          <p>Thank you for using our platform!</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated email. Please do not reply to this message.</p>
        </div>
      `;
    } else if (type === 'investment') {
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #D4AF37;">Investment Plan Activated</h1>
          <p>Hello ${username || 'User'},</p>
          <p>Your investment plan has been <strong style="color: #10b981;">activated successfully</strong>!</p>
          <div style="background: linear-gradient(135deg, #D4AF37 0%, #F5E6C8 100%); padding: 20px; border-radius: 8px; margin: 20px 0; color: #1a1a1a;">
            <p style="margin: 5px 0;"><strong>Plan:</strong> ${planName}</p>
            <p style="margin: 5px 0;"><strong>Amount Invested:</strong> ${amount}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${lockPeriod} days</p>
            ${totalReturns ? `<p style="margin: 5px 0;"><strong>Expected Returns:</strong> ${totalReturns}</p>` : ''}
          </div>
          <p>Your investment is now active and will mature after the duration ends.</p>
          <p>Thank you for investing with us!</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated email. Please do not reply to this message.</p>
        </div>
      `;
    } else if (type === 'topup_submitted') {
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #D4AF37;">Top-Up Request Submitted</h1>
          <p>Hello ${username || 'User'},</p>
          <p>Your top-up request has been <strong style="color: #f59e0b;">submitted for verification</strong>.</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Amount:</strong> ${amount}</p>
          </div>
          <p>Our admin team will verify your transaction and update your wallet balance within 24 hours.</p>
          <p>You will receive another email once your transaction is approved.</p>
          <p>Thank you for using our platform!</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated email. Please do not reply to this message.</p>
        </div>
      `;
    } else if (type === 'wallet_transfer') {
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #D4AF37;">Wallet Transfer Confirmation</h1>
          <p>Hello ${username || 'User'},</p>
          <p>Your wallet transfer has been <strong style="color: #10b981;">completed successfully</strong>!</p>
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Amount Transferred:</strong> ${amount}</p>
          </div>
          <p>The funds have been added to your wallet balance from your withdrawable balance.</p>
          <p>Thank you for using our platform!</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated email. Please do not reply to this message.</p>
        </div>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "Gold Platform <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-notification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
