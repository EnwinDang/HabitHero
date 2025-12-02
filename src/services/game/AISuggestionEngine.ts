import type { User } from "../../models/User";
import type { AITaskTemplate } from "../../models/AITaskTemplate";
import type { AIConfig } from "../../models/AIConfig";

/**
 * AISuggestionEngine
 * - krijgt: user, lijst van AI task templates, config
 * - geeft: gesorteerde lijst van tasks (beste bovenaan)
 */
export class AISuggestionEngine {
  static scoreTask(user: User, task: AITaskTemplate, config: AIConfig, currentTime: Date): number {
    let score = 0;

    const hour = currentTime.getHours();
    const timeOfDay =
      hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

    if (task.recommendedAt.includes(timeOfDay)) {
      score += 1 * config.timeWeight;
    }

    if (task.energyRequirement === user.aiProfile.energyLevel) {
      score += 1 * config.energyWeight;
    }

    if (user.aiProfile.preferredCategories.includes(task.category)) {
      score += 1 * config.userPreferenceWeight;
    }
    if (user.aiProfile.avoidedCategories.includes(task.category)) {
      score -= 1 * config.userPreferenceWeight;
    }

    const successCount = user.aiProfile.successfulTasks[task.category] ?? 0;
    const failCount = user.aiProfile.failedTasks[task.category] ?? 0;
    const historyScore = successCount - failCount;
    score += historyScore * config.historyWeight * 0.1;

    const worldProgressScore = user.currentStage * config.worldProgressWeight * 0.01;
    score += worldProgressScore;

    const randomJitter = (Math.random() * 2 - 1) * config.randomVariance;
    score += randomJitter;

    return score;
  }

  static suggestTasks(
    user: User,
    templates: AITaskTemplate[],
    config: AIConfig,
    currentTime: Date,
    max: number = 3
  ): AITaskTemplate[] {
    const scored = templates.map(t => ({
      task: t,
      score: this.scoreTask(user, t, config, currentTime)
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, max).map(s => s.task);
  }
}
