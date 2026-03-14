'use server';
/**
 * @fileOverview This file implements a Genkit flow for dynamically generating obstacle sequences for an endless runner game.
 *
 * - generateObstacleSequence - A function that handles the generation of obstacle sequences.
 * - GenerateObstacleSequenceInput - The input type for the generateObstacleSequence function.
 * - GenerateObstacleSequenceOutput - The return type for the generateObstacleSequence function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ObstacleTypeSchema = z.enum([
  'vehicle',
  'pet',
  'person',
  'waterPuddle',
]);

const LaneSchema = z.enum(['0', '1', '2']); // Use string for lanes as they might be used as keys or identifiers

const ObstacleSchema = z.object({
  type: ObstacleTypeSchema.describe('The type of the obstacle.'),
  lane: LaneSchema.describe('The lane (0, 1, or 2) in which the obstacle is placed.'),
  distanceFromStart: z
    .number()
    .describe('The distance from the start of the current segment where the obstacle appears.'),
  // Optional properties for lane narrowing events
  narrowingLaneStart: z
    .number()
    .optional()
    .describe(
      'Optional: The distance from the start of the current segment where a lane narrowing begins.'
    ),
  narrowingLaneEnd: z
    .number()
    .optional()
    .describe(
      'Optional: The distance from the start of the current segment where a lane narrowing ends.'
    ),
});

const GenerateObstacleSequenceInputSchema = z.object({
  playerSpeed: z
    .number()
    .describe('The current speed of the player, influencing obstacle difficulty.'),
  currentScore: z
    .number()
    .describe('The player\u0027s current score, influencing obstacle complexity.'),
  segmentLength: z
    .number()
    .describe('The length of the game segment (in units) for which to generate obstacles.'),
});
export type GenerateObstacleSequenceInput = z.infer<
  typeof GenerateObstacleSequenceInputSchema
>;

const GenerateObstacleSequenceOutputSchema = z.object({
  obstacles: z
    .array(ObstacleSchema)
    .describe('An array of obstacles to be placed in the game segment.'),
});
export type GenerateObstacleSequenceOutput = z.infer<
  typeof GenerateObstacleSequenceOutputSchema
>;

export async function generateObstacleSequence(
  input: GenerateObstacleSequenceInput
): Promise<GenerateObstacleSequenceOutput> {
  return dynamicObstaclePlacementFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dynamicObstaclePlacementPrompt',
  input: { schema: GenerateObstacleSequenceInputSchema },
  output: { schema: GenerateObstacleSequenceOutputSchema },
  prompt: `You are an AI game level designer for an endless runner game named SweetSprint. Your task is to dynamically generate a sequence of obstacles for a given game segment. The game has three lanes (0, 1, 2) and the following obstacle types: 'vehicle', 'pet', 'person', 'waterPuddle'.

Consider the player's current speed ({{{playerSpeed}}}) and score ({{{currentScore}}}) to create a challenging and engaging experience. Higher speed and score should generally lead to more frequent, varied, and complex obstacle patterns.

Generate obstacles for a segment of length {{{segmentLength}}} units. Ensure obstacles are not too close to each other, maintaining playability.

Occasionally, you can introduce lane narrowing events. When a lane narrows, specify 'narrowingLaneStart' and 'narrowingLaneEnd' distances. During narrowing, obstacles should generally be placed in the remaining open lanes or present a single-lane challenge.

Provide an array of obstacles, each with a 'type', 'lane', and 'distanceFromStart' within the segment. Optionally include 'narrowingLaneStart' and 'narrowingLaneEnd' for specific obstacles if they trigger a lane narrowing event. The 'distanceFromStart' should be a float between 0 and {{{segmentLength}}}.`,
});

const dynamicObstaclePlacementFlow = ai.defineFlow(
  {
    name: 'dynamicObstaclePlacementFlow',
    inputSchema: GenerateObstacleSequenceInputSchema,
    outputSchema: GenerateObstacleSequenceOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
