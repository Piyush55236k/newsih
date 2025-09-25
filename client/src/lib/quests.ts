export type Quest = { id: string; title: string; steps: string[]; reward: number }

export const QUESTS: Quest[] = [
  // Agronomy basics
  { id:'soil-setup', title:'Soil Test Setup', reward: 50, steps:['Collect soil sample','Measure pH','Record N-P-K','Get recommendations'] },
  { id:'pest-scout', title:'Pest Scouting', reward: 40, steps:['Check 5 random plants','Photograph suspicious leaves','Log findings','Plan treatment if needed'] },
  { id:'irrigation-check', title:'Irrigation Check', reward: 30, steps:['Inspect pump/valves','Check soil moisture at 3 spots','Adjust scheduling if dry'] },
  { id:'fertilizer-plan', title:'Fertilizer Plan', reward: 45, steps:['Review crop stage','Select N-P-K ratio','Plan application date'] },
  { id:'composting-start', title:'Start Composting', reward: 35, steps:['Collect green waste','Add dry carbon material','Turn pile and moisten'] },

  // Weather and planning
  { id:'weather-prep', title:'Weather Prep', reward: 25, steps:['Check 7-day forecast','Note risky days (rain/heat)','Create action notes'] },
  { id:'sowing-ready', title:'Sowing Readiness', reward: 30, steps:['Select seed variety','Prepare seed bed','Set sowing window'] },

  // Market and records
  { id:'market-check', title:'Market Check', reward: 25, steps:['Pick commodity','Record local price','Compare with last week'] },
  { id:'expense-log', title:'Expense Log', reward: 20, steps:['Record today’s expenses','Categorize (inputs/labor)','Save monthly total'] },

  // Community/productivity
  { id:'community-share', title:'Community Share', reward: 15, steps:['Post a farm photo','Share a tip or question','Respond to 1 farmer'] },
  { id:'feedback-app', title:'App Feedback', reward: 10, steps:['Open Feedback page','Submit one suggestion'] },
]

export function questTitleById(id: string): string {
  return QUESTS.find(q=>q.id===id)?.title || id
}
