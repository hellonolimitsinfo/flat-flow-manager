
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  householdId: string;
  householdName: string;
  inviterName: string;
  token: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Received invite request');
    
    // Check if RESEND_API_KEY is configured
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured - RESEND_API_KEY missing" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log('RESEND_API_KEY found, initializing Resend...');
    const resend = new Resend(resendApiKey);

    const { email, householdId, householdName, inviterName, token }: InviteRequest = await req.json();
    console.log('Processing invitation for:', email, 'to household:', householdName);

    // Get the site URL from environment
    const siteUrl = Deno.env.get('SITE_URL') || 'https://flat-flow-manager.lovable.app';
    const inviteUrl = `${siteUrl}/invite?token=${token}`;

    console.log('Sending email with invite URL:', inviteUrl);

    const emailResponse = await resend.emails.send({
      from: "FlatFlow <onboarding@resend.dev>",
      to: [email],
      subject: `You're invited to join ${householdName} on FlatFlow!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; text-align: center;">You're Invited!</h1>
          <p style="font-size: 16px; color: #666;">
            Hi there! ${inviterName} has invited you to join the <strong>${householdName}</strong> household on FlatFlow.
          </p>
          <p style="font-size: 16px; color: #666;">
            FlatFlow helps you manage chores, shopping lists, and expenses with your flatmates.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          <p style="font-size: 14px; color: #999; text-align: center;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${inviteUrl}" style="color: #3b82f6;">${inviteUrl}</a>
          </p>
          <p style="font-size: 12px; color: #999; text-align: center; margin-top: 30px;">
            This invitation will expire in 7 days.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Invitation email sent successfully",
      emailResponse 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    
    // Provide more specific error messages
    let errorMessage = "Failed to send invitation email";
    if (error.message?.includes("API key")) {
      errorMessage = "Invalid Resend API key. Please check your configuration.";
    } else if (error.message?.includes("domain")) {
      errorMessage = "Email domain not verified. Please verify your domain in Resend.";
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error.message,
        stack: error.stack || 'No additional details available'
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
