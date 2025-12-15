import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Fetching gold price from digigold.com');
    
    const response = await fetch('https://www.digigold.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const html = await response.text();
    
    // Extract the buying price for 24K gold from the HTML
    // Looking for pattern: ₹12409.2/gm or similar
    const priceMatch = html.match(/₹([\d,]+\.?\d*?)\/gm/);
    const changeMatch = html.match(/([\d.]+)%\s+since\s+yesterday/);
    
    let buyingPrice = 0;
    let changePercentage = 0;
    
    if (priceMatch && priceMatch[1]) {
      // Remove commas and convert to number
      buyingPrice = parseFloat(priceMatch[1].replace(/,/g, ''));
    }
    
    if (changeMatch && changeMatch[1]) {
      changePercentage = parseFloat(changeMatch[1]);
    }

    console.log('Extracted buying price:', buyingPrice);
    console.log('Extracted change percentage:', changePercentage);

    return new Response(
      JSON.stringify({ 
        buyingPrice,
        changePercentage,
        lastUpdated: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error fetching digigold price:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
