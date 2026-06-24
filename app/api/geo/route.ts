import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Vercel sets these headers automatically on every request — no external API, no rate limit
  const country = request.headers.get('x-vercel-ip-country-region')
    ? request.headers.get('x-vercel-ip-country') // country code (e.g. "US")
    : request.headers.get('x-vercel-ip-country')
  const city = request.headers.get('x-vercel-ip-city')
    ? decodeURIComponent(request.headers.get('x-vercel-ip-city')!)
    : null
  const countryCode = request.headers.get('x-vercel-ip-country')

  // Map country code to full name for display
  const countryNames: Record<string, string> = {
    US: 'United States', FR: 'France', GB: 'United Kingdom', CA: 'Canada',
    DE: 'Germany', MA: 'Morocco', BE: 'Belgium', CH: 'Switzerland',
    ES: 'Spain', IT: 'Italy', AU: 'Australia', BR: 'Brazil',
    MX: 'Mexico', NL: 'Netherlands', SE: 'Sweden', DZ: 'Algeria',
    TN: 'Tunisia', SN: 'Senegal', CM: 'Cameroon', CI: "Côte d'Ivoire",
    NG: 'Nigeria', GH: 'Ghana', PT: 'Portugal', RO: 'Romania',
    PL: 'Poland', RU: 'Russia', JP: 'Japan', KR: 'South Korea',
    IN: 'India', AE: 'United Arab Emirates', SA: 'Saudi Arabia',
  }

  return NextResponse.json({
    country: countryCode ? (countryNames[countryCode] ?? countryCode) : null,
    city,
  })
}
