// Self-hosted fonts via next/font — no external request to Google (privacy +
// anti-detection). Each font exposes a CSS variable; FONT_VARS bundles all the
// variable classNames so the root layout can declare them once, making
// var(--font-*) resolvable anywhere in the app (public pages AND edit preview).
import {
  Inter,
  Poppins,
  Montserrat,
  Playfair_Display,
  Dancing_Script,
  Bebas_Neue,
  Quicksand,
  Cormorant_Garamond,
} from 'next/font/google'

export const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins', display: 'swap' })
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', display: 'swap' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' })
const dancing = Dancing_Script({ subsets: ['latin'], variable: '--font-dancing', display: 'swap' })
const bebas = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-bebas', display: 'swap' })
const quicksand = Quicksand({ subsets: ['latin'], variable: '--font-quicksand', display: 'swap' })
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '600'], variable: '--font-cormorant', display: 'swap' })

export const FONT_VARS = [
  inter, poppins, montserrat, playfair, dancing, bebas, quicksand, cormorant,
].map(f => f.variable).join(' ')
