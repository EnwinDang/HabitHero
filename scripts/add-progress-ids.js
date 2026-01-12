/**
 * Script to add progressId field to existing achievements in Firebase
 * 
 * Usage:
 * 1. Make sure you have Firebase CLI installed and are logged in
 * 2. Run: node scripts/add-progress-ids.js
 * 
 * Or use Firebase Admin SDK:
 * 1. Set up Firebase Admin credentials
 * 2. Run: node scripts/add-progress-ids.js
 */

// Mapping of catalog IDs to progress IDs
const PROGRESS_ID_MAPPING = {
  'ach_easy_10': 'task_master_10', // Generic task achievement (10 tasks)
  'ach_extreme_1': 'task_extreme_1', // Complete 1 extreme task
  'ach_hard_3': 'task_hard_3', // Complete 3 hard tasks
  'ach_medium_5': 'task_medium_5', // Complete 5 medium tasks
  'ach_monsters_10': 'monster_10',
  'ach_pomodoro_10': 'focus_10',
  'ach_streak_7': 'streak_7',
  // Add more mappings as needed
  // For module/world achievements, you may want to keep the same ID or create new ones
  'ach_module_1_complete': 'ach_module_1_complete',
  'ach_module_2_complete': 'ach_module_2_complete',
  'ach_world_1_complete': 'ach_world_1_complete',
};

// Function to map catalog ID to progress ID (same logic as frontend)
function mapAchievementId(catalogId, title, description) {
  // Check explicit mapping first
  if (PROGRESS_ID_MAPPING[catalogId]) {
    return PROGRESS_ID_MAPPING[catalogId];
  }

  const catalogIdLower = catalogId.toLowerCase();
  
  // Monster achievements
  if (catalogIdLower.includes('monster')) {
    if (catalogIdLower.match(/\b100\b/)) return 'monster_100';
    if (catalogIdLower.match(/\b50\b/)) return 'monster_50';
    if (catalogIdLower.match(/\b10\b/)) return 'monster_10';
    if (catalogIdLower.includes('first')) return 'monster_first';
    return 'monster_10';
  }
  
  // Focus/Pomodoro achievements
  if (catalogIdLower.includes('pomodoro') || catalogIdLower.includes('focus')) {
    if (catalogIdLower.match(/\b10\b/)) return 'focus_10';
    if (catalogIdLower.includes('first')) return 'focus_first';
    return 'focus_10';
  }
  
  // Task achievements
  if (catalogIdLower.includes('easy') || catalogIdLower.includes('medium') || 
      catalogIdLower.includes('hard') || catalogIdLower.includes('extreme')) {
    const numberMatch = catalogIdLower.match(/_(\d+)$/) || 
                       catalogIdLower.match(/_(\d+)_/) || 
                       catalogIdLower.match(/\b(\d+)\b/);
    const number = numberMatch ? parseInt(numberMatch[1], 10) : 0;
    
    // Extract difficulty level
    let difficulty = '';
    if (catalogIdLower.includes('extreme')) difficulty = 'extreme';
    else if (catalogIdLower.includes('hard')) difficulty = 'hard';
    else if (catalogIdLower.includes('medium')) difficulty = 'medium';
    else if (catalogIdLower.includes('easy')) difficulty = 'easy';
    
    // For generic task achievements (no specific difficulty), use standard progress IDs
    if (number === 1 && !difficulty) return 'first_task';
    if (number >= 100 && !difficulty) return 'task_master_100';
    if (number >= 50 && !difficulty) return 'task_master_50';
    if (number >= 10 && !difficulty) return 'task_master_10';
    
    // For difficulty-specific achievements, create specific progress IDs
    if (difficulty && number > 0) {
      return `task_${difficulty}_${number}`;
    }
    
    if (catalogIdLower.includes('first')) return 'first_task';
    return 'first_task';
  }
  
  // Streak achievements
  if (catalogIdLower.includes('streak')) {
    if (catalogIdLower.includes('30')) return 'streak_30';
    if (catalogIdLower.includes('7')) return 'streak_7';
    if (catalogIdLower.includes('3')) return 'streak_3';
    return 'streak_3';
  }
  
  // Level achievements
  if (catalogIdLower.includes('level')) {
    if (catalogIdLower.match(/\b25\b/)) return 'level_25';
    if (catalogIdLower.match(/\b10\b/)) return 'level_10';
    if (catalogIdLower.match(/\b5\b/)) return 'level_5';
    return 'level_5';
  }
  
  // Default: return original ID
  return catalogId;
}

console.log('📋 Achievement Progress ID Mappings:');
console.log('=====================================\n');

Object.entries(PROGRESS_ID_MAPPING).forEach(([catalogId, progressId]) => {
  console.log(`${catalogId.padEnd(30)} → ${progressId}`);
});

console.log('\n📝 Instructions:');
console.log('1. Go to Firebase Console → Firestore Database');
console.log('2. Navigate to the "achievements" collection');
console.log('3. For each achievement document, add a field:');
console.log('   - Field name: "progressId"');
console.log('   - Field type: string');
console.log('   - Field value: (use the mapping above)');
console.log('\n💡 Tip: You can also use the Firebase CLI or Admin SDK to batch update these fields.');
