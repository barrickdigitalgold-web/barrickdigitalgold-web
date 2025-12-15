import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("Starting auto-mature investments job...");

    // Get all active investments that have passed their end_date
    const { data: maturedInvestments, error: fetchError } = await supabase
      .from("user_investments")
      .select(`
        *,
        investment_plans (
          returns_percentage
        )
      `)
      .eq("status", "active")
      .lt("end_date", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching matured investments:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${maturedInvestments?.length || 0} matured investments`);

    if (!maturedInvestments || maturedInvestments.length === 0) {
      return new Response(
        JSON.stringify({ message: "No matured investments found" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Process each matured investment
    for (const investment of maturedInvestments) {
      try {
        const totalReturn = investment.amount_invested + 
          (investment.amount_invested * investment.investment_plans.returns_percentage / 100);

        // Get current wallet balance
        const { data: walletData, error: walletFetchError } = await supabase
          .from("wallet_balances")
          .select("balance")
          .eq("user_id", investment.user_id)
          .single();

        if (walletFetchError) {
          console.error(`Error fetching wallet for user ${investment.user_id}:`, walletFetchError);
          continue;
        }

        const currentBalance = Number(walletData.balance) || 0;
        const newBalance = currentBalance + totalReturn;

        // Update wallet balance (adding funds, so no negative check needed)
        const { error: walletUpdateError } = await supabase
          .from("wallet_balances")
          .update({ balance: newBalance })
          .eq("user_id", investment.user_id);

        if (walletUpdateError) {
          console.error(`Error updating wallet for user ${investment.user_id}:`, walletUpdateError);
          continue;
        }

        // Update investment status to completed
        const { error: investmentUpdateError } = await supabase
          .from("user_investments")
          .update({ status: "completed" })
          .eq("id", investment.id);

        if (investmentUpdateError) {
          console.error(`Error updating investment ${investment.id}:`, investmentUpdateError);
          continue;
        }

        // Create notification for matured investment
        const { error: notificationError } = await supabase
          .rpc('create_notification', {
            p_user_id: investment.user_id,
            p_title: 'Investment Matured',
            p_message: `Your investment of ₹${investment.amount_invested} has matured! Total return of ₹${totalReturn} has been credited to your wallet.`,
            p_type: 'investment',
            p_related_id: investment.id
          });

        if (notificationError) {
          console.error(`Error creating notification for investment ${investment.id}:`, notificationError);
        }

        // Get or create chat conversation for this user
        const { data: conversation, error: convError } = await supabase
          .from('chat_conversations')
          .select('id')
          .eq('user_id', investment.user_id)
          .eq('subject', 'Investment Maturity Notification')
          .single();

        let conversationId = conversation?.id;

        if (!conversationId) {
          const { data: newConv, error: createConvError } = await supabase
            .from('chat_conversations')
            .insert({
              user_id: investment.user_id,
              subject: 'Investment Maturity Notification',
              status: 'open'
            })
            .select('id')
            .single();

          if (createConvError) {
            console.error(`Error creating conversation for user ${investment.user_id}:`, createConvError);
          } else {
            conversationId = newConv.id;
          }
        }

        // Create chat message if conversation exists
        if (conversationId) {
          const { error: chatError } = await supabase
            .from('chat_messages')
            .insert({
              conversation_id: conversationId,
              sender_id: investment.user_id,
              message: `🎉 Your investment of ₹${investment.amount_invested} has matured! Total return of ₹${totalReturn} has been credited to your wallet.`
            });

          if (chatError) {
            console.error(`Error creating chat message for investment ${investment.id}:`, chatError);
          }
        }

        console.log(`Successfully matured investment ${investment.id} for user ${investment.user_id}, credited ₹${totalReturn}`);
      } catch (error) {
        console.error(`Error processing investment ${investment.id}:`, error);
        continue;
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Auto-mature process completed",
        processed: maturedInvestments.length 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in auto-mature-investments function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
