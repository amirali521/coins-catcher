
'use server';

/**
 * @fileoverview A Genkit flow for calculating withdrawal options in a gaming app.
 *
 * This file defines the logic for calculating various withdrawal options (PKR, PUBG UC, FreeFire Diamonds)
 * based on a user's coin balance. It uses the Gemini API to perform conversions and determine package costs.
 *
 * - calculateWithdrawalFlow - The main exported async function to call the flow.
 * - PkrOption, UcOption, DiamondOption - Type definitions for the output.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Input Schema
const WithdrawalCalculationInputSchema = z.object({
  withdrawalType: z.enum(['pkr', 'uc', 'ff_diamond']).describe("The type of withdrawal calculation requested."),
  userCoins: z.number().describe("The user's current coin balance."),
});
type WithdrawalCalculationInput = z.infer<typeof WithdrawalCalculationInputSchema>;

// Output Schemas
const PkrOptionSchema = z.object({
  pkr: z.number().describe("The amount in Pakistani Rupees (PKR)."),
  usd: z.number().describe("The equivalent amount in US Dollars (USD)."),
  coinCost: z.number().describe("The cost in in-app coins."),
});
export type PkrOption = z.infer<typeof PkrOptionSchema>;

const UcOptionSchema = z.object({
  uc: z.number().describe("The amount of PUBG Mobile UC."),
  coinCost: z.number().describe("The cost in in-app coins."),
});
export type UcOption = z.infer<typeof UcOptionSchema>;

const DiamondOptionSchema = z.object({
  diamonds: z.number().describe("The amount of FreeFire Diamonds."),
  coinCost: z.number().describe("The cost in in-app coins."),
});
export type DiamondOption = z.infer<typeof DiamondOptionSchema>;

const WithdrawalCalculationOutputSchema = z.object({
  pkrOptions: z.array(PkrOptionSchema).optional().describe("List of PKR withdrawal options."),
  ucOptions: z.array(UcOptionSchema).optional().describe("List of PUBG UC withdrawal options."),
  diamondOptions: z.array(DiamondOptionSchema).optional().describe("List of FreeFire Diamond withdrawal options."),
  insufficientFunds: z.boolean().describe("Whether the user has enough coins for the smallest option."),
  message: z.string().describe("A message to the user, especially if they have insufficient funds."),
});
export type WithdrawalCalculationOutput = z.infer<typeof WithdrawalCalculationOutputSchema>;


const calculationPrompt = ai.definePrompt({
    name: 'withdrawalCalculatorPrompt',
    input: { schema: WithdrawalCalculationInputSchema },
    output: { schema: WithdrawalCalculationOutputSchema },
    prompt: `
      You are a financial assistant for a gaming app. A user wants to see their withdrawal options.
      The base conversion rate is 100,000 coins = 1 USD.

      The user has {{userCoins}} coins.
      The requested calculation type is '{{withdrawalType}}'.

      Your task is to calculate the available options and determine if the user has enough coins for the smallest package.

      - If 'withdrawalType' is 'pkr':
        1. Calculate options for withdrawing 1, 5, and 10 USD.
        2. For each USD amount, calculate the 'coinCost'.
        3. Use your knowledge of the current USD to PKR exchange rate to provide the 'pkr' amount for each option.
        4. Set 'pkrOptions' in the output.
        5. Check if userCoins is less than the cost for 1 USD. If so, set 'insufficientFunds' to true and provide a helpful 'message'.

      - If 'withdrawalType' is 'uc':
        1. Provide options for 60, 120, and 180 UC.
        2. Pricing: 60 UC costs $0.99 USD. 120 UC costs $1.99 USD. 180 UC costs $2.99 USD.
        3. Calculate the 'coinCost' for each UC package based on their USD price and the coin conversion rate. Round the coin cost to the nearest whole number.
        4. Set 'ucOptions' in the output.
        5. Check if userCoins is less than the cost for 60 UC. If so, set 'insufficientFunds' to true and provide a helpful 'message'.

      - If 'withdrawalType' is 'ff_diamond':
        1. Provide options for 100, 310, and 520 Diamonds.
        2. Pricing: 100 Diamonds cost $0.99 USD. 310 Diamonds cost $2.99 USD. 520 Diamonds cost $4.99 USD.
        3. Calculate the 'coinCost' for each Diamond package based on their USD price and the coin conversion rate. Round the coin cost to the nearest whole number.
        4. Set 'diamondOptions' in the output.
        5. Check if userCoins is less than the cost for 100 Diamonds. If so, set 'insufficientFunds' to true and provide a helpful 'message'.

      Always return a valid JSON object matching the output schema. If funds are sufficient, set 'insufficientFunds' to false and the 'message' to 'Here are your options.'.
    `,
});

const calculateWithdrawalFlowInternal = ai.defineFlow(
  {
    name: 'calculateWithdrawalFlow',
    inputSchema: WithdrawalCalculationInputSchema,
    outputSchema: WithdrawalCalculationOutputSchema,
  },
  async (input) => {
    const { output } = await calculationPrompt(input);
    if (!output) {
        throw new Error("The model failed to return a valid calculation.");
    }
    return output;
  }
);

export async function calculateWithdrawalFlow(input: WithdrawalCalculationInput): Promise<WithdrawalCalculationOutput> {
    return calculateWithdrawalFlowInternal(input);
}
