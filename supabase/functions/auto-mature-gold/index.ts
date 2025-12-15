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

    console.log("Starting auto-mature gold purchases job...");

    // Get all locked gold purchases that have passed their maturity date
    const { data: maturedGold, error: fetchError } = await supabase
      .from("gold_purchases")
      .select("*")
      .eq("status", "locked")
      .lt("maturity_date", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching matured gold purchases:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${maturedGold?.length || 0} matured gold purchases`);

    if (!maturedGold || maturedGold.length === 0) {
      return new Response(
        JSON.stringify({ message: "No matured gold purchases found" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Process each matured gold purchase
    for (const gold of maturedGold) {
      try {
        // Update gold purchase status to mature
        const { error: goldUpdateError } = await supabase
          .from("gold_purchases")
          .update({ status: "mature" })
          .eq("id", gold.id);

        if (goldUpdateError) {
          console.error(`Error updating gold purchase ${gold.id}:`, goldUpdateError);
          continue;
        }

        // Create notification for matured gold
        const { error: notificationError } = await supabase
          .rpc('create_notification', {
            p_user_id: gold.user_id,
            p_title: 'Gold Purchase Matured',
            p_message: `Your gold purchase of ${gold.gold_amount_grams}g has matured! You can now sell your gold holdings.`,
            p_type: 'gold_purchase',
            p_related_id: gold.id
          });

        if (notificationError) {
          console.error(`Error creating notification for gold ${gold.id}:`, notificationError);
        }

        // Get or create chat conversation for this user
        const { data: conversation, error: convError } = await supabase
          .from('chat_conversations')
          .select('id')
          .eq('user_id', gold.user_id)
          .eq('subject', 'Gold Maturity Notification')
          .single();

        let conversationId = conversation?.id;

        if (!conversationId) {
          const { data: newConv, error: createConvError } = await supabase
            .from('chat_conversations')
            .insert({
              user_id: gold.user_id,
              subject: 'Gold Maturity Notification',
              status: 'open'
            })
            .select('id')
            .single();

          if (createConvError) {
            console.error(`Error creating conversation for user ${gold.user_id}:`, createConvError);
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
              sender_id: gold.user_id,
              message: `🎉 Your gold purchase of ${gold.gold_amount_grams}g has matured! You can now sell your gold holdings.`
            });

          if (chatError) {
            console.error(`Error creating chat message for gold ${gold.id}:`, chatError);
          }
        }

        console.log(`Successfully matured gold purchase ${gold.id} for user ${gold.user_id}`);
      } catch (error) {
        console.error(`Error processing gold purchase ${gold.id}:`, error);
        continue;
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Auto-mature gold process completed",
        processed: maturedGold.length 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in auto-mature-gold function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
