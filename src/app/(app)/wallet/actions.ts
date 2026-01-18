
'use server';

import { calculateWithdrawalFlow } from "@/ai/flows/wallet-flow";

export async function calculateWithdrawalOptions(withdrawalType: 'pkr' | 'uc' | 'ff_diamond', userCoins: number) {
  return await calculateWithdrawalFlow({ withdrawalType, userCoins });
}
