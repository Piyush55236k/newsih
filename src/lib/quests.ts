export type Quest = { id: string; title: string; steps: string[]; reward: number }

export const QUESTS: Quest[] = [
  { id:'soil-setup', title:'Soil Test Setup', reward: 50, steps:['Collect soil sample','Measure pH','Record N-P-K','Get recommendations'] },
  { id:'pest-scout', title:'Pest Scouting', reward: 40, steps:['Check 5 random plants','Photograph suspicious leaves','Log findings','Plan treatment if needed'] },
  { id:'market-check', title:'Market Check', reward: 25, steps:['Pick commodity','Record local price','Compare with last week'] },
]

export function questTitleById(id: string): string {
  return QUESTS.find(q=>q.id===id)?.title || id
}
