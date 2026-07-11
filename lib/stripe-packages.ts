export interface CreditPackage {
  id: string
  credits: number
  priceCents: number
  displayPrice: string
  tag?: string
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  { id: 'credits_500',  credits: 500,  priceCents: 199,  displayPrice: '$1.99' },
  { id: 'credits_1500', credits: 1500, priceCents: 499,  displayPrice: '$4.99', tag: 'Popular' },
  { id: 'credits_4000', credits: 4000, priceCents: 999,  displayPrice: '$9.99', tag: 'Best Value' },
]
