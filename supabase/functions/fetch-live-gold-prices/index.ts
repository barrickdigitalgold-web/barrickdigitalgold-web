import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoldPrice {
  country: string;
  currency: string;
  pricePerGram: string;
  pricePerOunce: string;
  pricePerTola: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Fetching gold prices from livepriceofgold.com');
    
    const response = await fetch('https://www.livepriceofgold.com/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const html = await response.text();
    
    // Extract gold prices from the HTML table
    const prices: GoldPrice[] = [];
    
    // Match country and currency names
    const countryMatches = html.matchAll(/<a href="[^"]*" title="Gold Price in ([^"]+)">([^<]+)<br>\s*<span class="unit blue">([^<]+)<\/span><\/a>/g);
    const countries = Array.from(countryMatches);
    
    // Extract all price values with data-price attributes
    const priceMatches = html.matchAll(/<span data-price="[^"]*"[^>]*>\s*([\d,]+\.?\d*)\s*<\/span>/g);
    const priceValues = Array.from(priceMatches).map(m => m[1].replace(/,/g, ''));
    
    // Each country has 3 prices: gram, ounce, tola
    let priceIndex = 0;
    for (const country of countries) {
      const countryName = country[1].trim();
      const currencyName = country[3].trim();
      
      if (priceIndex + 2 < priceValues.length) {
        const gramPrice = priceValues[priceIndex];
        const ouncePrice = priceValues[priceIndex + 1];
        const tolaPrice = priceValues[priceIndex + 2];
        
        // Extract currency code from currency name
        const currencyCodeMap: { [key: string]: string } = {
          'Indian Rupee': 'INR',
          'Bangladeshi Taka': 'BDT',
          'United Arab Emirates Dirham': 'AED',
          'US Dollar': 'USD',
          'British Pound': 'GBP',
          'Saudi Riyal': 'SAR',
          'Kuwaiti Dinar': 'KWD',
          'Qatari Riyal': 'QAR',
          'Omani Rial': 'OMR',
          'Bahraini Dinar': 'BHD',
          'Pakistani Rupee': 'PKR',
          'Canadian Dollar': 'CAD',
          'Australian Dollar': 'AUD',
          'Singapore Dollar': 'SGD',
          'Euro': 'EUR',
        };
        
        const currencyCode = currencyCodeMap[currencyName] || currencyName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);
        
        prices.push({
          country: countryName,
          currency: currencyCode,
          pricePerGram: `${gramPrice}`,
          pricePerOunce: `${ouncePrice}`,
          pricePerTola: `${tolaPrice}`,
        });
        
        priceIndex += 3;
      }
    }

    console.log(`Extracted ${prices.length} country gold prices`);

    return new Response(
      JSON.stringify({ 
        prices,
        lastUpdated: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error fetching live gold prices:', error);
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
