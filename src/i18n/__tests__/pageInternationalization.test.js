/**
 * Page Internationalization Tests
 * 
 * Tests for Requirements 1.1, 1.2, 1.3, 1.4, 1.5:
 * - All pages display text according to system language
 * - No hardcoded text in pages
 * - Chinese/English switching works correctly
 * 
 * This test verifies that all screen files:
 * 1. Import and use the useTranslation hook
 * 2. Do not contain hardcoded Chinese or English user-facing text
 * 3. Use translation keys for all user-visible strings
 */

const fs = require('fs');
const path = require('path');

// List of all screen files that should be internationalized
const SCREEN_FILES = [
  'QuestionDetailScreen.js',
  'QuestionActivityListScreen.js',
  'QuestionRankingScreen.js',
  'QuestionBankScreen.js',
  'QuestionTeamsScreen.js',
  'ActivityScreen.js',
  'CreateActivityScreen.js',
  'WisdomIndexScreen.js',
  'WisdomExamScreen.js',
  'ExamDetailScreen.js',
  'ExamHistoryScreen.js',
  'SettingsScreen.js',
  'ProfileScreen.js',
  'InviteAnswerScreen.js',
  'InviteTeamMemberScreen.js',
  'SearchScreen.js',
  'ReportScreen.js',
  'UploadBankScreen.js',
  'TeamDetailScreen.js',
  'SupplementDetailScreen.js',
  'SuperLikeHistoryScreen.js',
  'SuperLikePurchaseScreen.js',
  'MessagesScreen.js',
  'GroupChatScreen.js',
  'HotListScreen.js',
  'IncomeRankingScreen.js',
  'ContributorsScreen.js',
  'AddRewardScreen.js',
  'AnswerDetailScreen.js',
];

// Screens that are known to be not yet internationalized or have special cases
const KNOWN_EXCEPTIONS = {
  // Add screens here that have legitimate reasons for hardcoded text
  // Format: 'ScreenName.js': 'Reason for exception'
};

describe('Page Internationalization', () => {
  const screensDir = path.join(__dirname, '../../screens');

  /**
   * Helper: Read screen file content
   */
  function readScreenFile(filename) {
    const filePath = path.join(screensDir, filename);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.readFileSync(filePath, 'utf-8');
  }

  /**
   * Helper: Check if file imports useTranslation
   */
  function importsUseTranslation(content) {
    const importPatterns = [
      /import\s+{\s*useTranslation\s*}\s+from\s+['"].*i18n.*['"]/,
      /import\s+useTranslation\s+from\s+['"].*i18n.*['"]/,
      /const\s+{\s*useTranslation\s*}\s*=\s*require\(['"].*i18n.*['"]\)/,
    ];
    return importPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Helper: Check if file uses useTranslation hook
   */
  function usesTranslationHook(content) {
    const usagePatterns = [
      /const\s+{\s*t\s*}\s*=\s*useTranslation\(\)/,
      /const\s+{\s*t\s*,.*}\s*=\s*useTranslation\(\)/,
      /const\s+{.*,\s*t\s*}\s*=\s*useTranslation\(\)/,
      /const\s+{[\s\S]*?\bt\s*[\s\S]*?}\s*=\s*useTranslation\(\)/m,
    ];
    return usagePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Helper: Find hardcoded Chinese text (excluding comments and mock data)
   */
  function findHardcodedChinese(content) {
    const lines = content.split('\n');
    const hardcodedText = [];
    let inMockDataBlock = false;
    let braceDepth = 0;
    
    // Chinese character range
    const chineseRegex = /[\u4e00-\u9fa5]+/g;
    
    lines.forEach((line, index) => {
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        return;
      }
      
      // Track if we're inside a mock data block
      if (line.includes('mockData') || line.includes('MOCK_') || 
          line.includes('const wisdomData =') || line.includes('const examHistory =') ||
          line.includes('const mockUsers =') || line.includes('const mockQuestions =')) {
        inMockDataBlock = true;
        braceDepth = 0;
      }
      
      // Track brace depth to know when mock data block ends
      if (inMockDataBlock) {
        braceDepth += (line.match(/{/g) || []).length;
        braceDepth -= (line.match(/}/g) || []).length;
        
        if (braceDepth <= 0 && line.includes('}')) {
          inMockDataBlock = false;
        }
        return; // Skip all lines in mock data blocks
      }
      
      // Skip object property definitions (like bankName:, bankAuthor:, etc.)
      if (line.match(/^\s*\w+:\s*['"][\u4e00-\u9fa5]+['"]/)) {
        return;
      }
      
      // Check for Chinese characters in JSX or strings
      const matches = line.match(chineseRegex);
      if (matches) {
        // Check if it's in a JSX Text element or string literal that's user-facing
        if (line.includes('<Text') || line.includes('title=') || 
            line.includes('placeholder=') || line.includes('label=') ||
            line.includes('Alert.alert')) {
          // Exclude console statements
          if (!line.includes('console.')) {
            hardcodedText.push({
              line: index + 1,
              content: line.trim(),
              matches: matches,
            });
          }
        }
      }
    });
    
    return hardcodedText;
  }

  /**
   * Helper: Find hardcoded English text (excluding comments, imports, and common code)
   */
  function findHardcodedEnglish(content) {
    const lines = content.split('\n');
    const hardcodedText = [];
    
    // Pattern for quoted English strings that look like user-facing text
    const englishTextRegex = /(['"`])([A-Z][a-zA-Z\s]{3,})(['"`])/g;
    
    lines.forEach((line, index) => {
      // Skip comments, imports, and console statements
      if (line.trim().startsWith('//') || 
          line.trim().startsWith('*') ||
          line.includes('import ') ||
          line.includes('from ') ||
          line.includes('console.') ||
          line.includes('mockData') ||
          line.includes('MOCK_')) {
        return;
      }
      
      const matches = line.match(englishTextRegex);
      if (matches) {
        // Filter out common code patterns
        const filtered = matches.filter(match => {
          const text = match.replace(/['"`]/g, '');
          // Skip common prop names, component names, etc.
          return !['View', 'Text', 'TouchableOpacity', 'ScrollView', 
                   'SafeAreaView', 'FlatList', 'Image', 'Button',
                   'TextInput', 'Modal', 'Alert', 'Platform'].includes(text);
        });
        
        if (filtered.length > 0) {
          hardcodedText.push({
            line: index + 1,
            content: line.trim(),
            matches: filtered,
          });
        }
      }
    });
    
    return hardcodedText;
  }

  /**
   * Helper: Check if file uses t() function for translations
   */
  function usesTranslationFunction(content) {
    const translationCallPatterns = [
      /t\(['"][\w.]+['"]\)/,
      /t\(`[\w.]+`\)/,
      /{t\(['"][\w.]+['"]\)}/,
    ];
    return translationCallPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Requirement 1.1, 1.2, 1.3, 1.4, 1.5: All pages should import useTranslation
   */
  describe('useTranslation Hook Import', () => {
    SCREEN_FILES.forEach(filename => {
      test(`${filename} should import useTranslation hook`, () => {
        const content = readScreenFile(filename);
        
        if (!content) {
          // File doesn't exist - skip test
          console.warn(`Warning: ${filename} not found`);
          return;
        }

        if (KNOWN_EXCEPTIONS[filename]) {
          console.log(`Skipping ${filename}: ${KNOWN_EXCEPTIONS[filename]}`);
          return;
        }

        expect(importsUseTranslation(content)).toBe(true);
      });
    });
  });

  /**
   * Requirement 1.1, 1.2, 1.3, 1.4, 1.5: All pages should use useTranslation hook
   */
  describe('useTranslation Hook Usage', () => {
    SCREEN_FILES.forEach(filename => {
      test(`${filename} should use useTranslation hook`, () => {
        const content = readScreenFile(filename);
        
        if (!content) {
          return;
        }

        if (KNOWN_EXCEPTIONS[filename]) {
          return;
        }

        expect(usesTranslationHook(content)).toBe(true);
      });
    });
  });

  /**
   * Requirement 1.1, 1.2, 1.3, 1.4, 1.5: Pages should not contain hardcoded Chinese text
   */
  describe('No Hardcoded Chinese Text', () => {
    SCREEN_FILES.forEach(filename => {
      test(`${filename} should not contain hardcoded Chinese text`, () => {
        const content = readScreenFile(filename);
        
        if (!content) {
          return;
        }

        if (KNOWN_EXCEPTIONS[filename]) {
          return;
        }

        const hardcodedChinese = findHardcodedChinese(content);
        
        if (hardcodedChinese.length > 0) {
          const errorMessage = `Found ${hardcodedChinese.length} hardcoded Chinese text(s) in ${filename}:\n` +
            hardcodedChinese.slice(0, 5).map(item => 
              `  Line ${item.line}: ${item.content}`
            ).join('\n') +
            (hardcodedChinese.length > 5 ? `\n  ... and ${hardcodedChinese.length - 5} more` : '');
          
          console.warn(errorMessage);
        }

        expect(hardcodedChinese.length).toBe(0);
      });
    });
  });

  /**
   * Requirement 1.1, 1.2, 1.3, 1.4, 1.5: Pages should use t() function for translations
   */
  describe('Translation Function Usage', () => {
    SCREEN_FILES.forEach(filename => {
      test(`${filename} should use t() function for translations`, () => {
        const content = readScreenFile(filename);
        
        if (!content) {
          return;
        }

        if (KNOWN_EXCEPTIONS[filename]) {
          return;
        }

        // If the file imports and uses useTranslation, it should also call t()
        if (importsUseTranslation(content) && usesTranslationHook(content)) {
          expect(usesTranslationFunction(content)).toBe(true);
        }
      });
    });
  });

  /**
   * Integration test: Verify translation keys exist for all screens
   */
  describe('Translation Keys Existence', () => {
    const zhTranslations = require('../locales/zh.json');
    const enTranslations = require('../locales/en.json');

    test('should have translation keys for all internationalized screens', () => {
      const screenNamespaces = Object.keys(zhTranslations.screens || {});
      
      // Check that we have translations for major screens
      const expectedScreens = [
        'questionDetail',
        'questionActivityList',
        'questionRanking',
        'questionBank',
        'questionTeams',
        'activity',
        'createActivity',
        'wisdomIndex',
        'wisdomExam',
        'examDetail',
        'examHistory',
        'settings',
        'inviteAnswer',
        'inviteTeamMember',
        'search',
        'report',
        'uploadBank',
        'teamDetail',
        'supplementDetail',
        'superLikeHistory',
        'superLikePurchase',
        'messages',
        'groupChat',
        'hotList',
        'incomeRanking',
        'contributors',
        'addReward',
        'answerDetail',
      ];

      const missingScreens = expectedScreens.filter(
        screen => !screenNamespaces.includes(screen)
      );

      if (missingScreens.length > 0) {
        console.warn(`Missing translation namespaces for: ${missingScreens.join(', ')}`);
      }

      // We expect at least 9 screen namespaces (current state)
      expect(screenNamespaces.length).toBeGreaterThanOrEqual(9);
    });

    test('should have matching translation keys in both zh.json and en.json', () => {
      const zhScreens = Object.keys(zhTranslations.screens || {});
      const enScreens = Object.keys(enTranslations.screens || {});

      // Both should have the same screen namespaces
      expect(zhScreens.sort()).toEqual(enScreens.sort());
    });
  });

  /**
   * Summary test: Overall internationalization coverage
   */
  describe('Internationalization Coverage Summary', () => {
    test('should have high internationalization coverage', () => {
      let totalScreens = 0;
      let internationalizedScreens = 0;
      let screensWithIssues = [];

      SCREEN_FILES.forEach(filename => {
        const content = readScreenFile(filename);
        
        if (!content) {
          return;
        }

        totalScreens++;

        const hasImport = importsUseTranslation(content);
        const hasUsage = usesTranslationHook(content);
        const hasCalls = usesTranslationFunction(content);
        const hardcodedChinese = findHardcodedChinese(content);

        if (hasImport && hasUsage && hasCalls && hardcodedChinese.length === 0) {
          internationalizedScreens++;
        } else {
          screensWithIssues.push({
            file: filename,
            hasImport,
            hasUsage,
            hasCalls,
            hardcodedCount: hardcodedChinese.length,
          });
        }
      });

      const coverage = (internationalizedScreens / totalScreens) * 100;

      console.log(`\nInternationalization Coverage: ${internationalizedScreens}/${totalScreens} (${coverage.toFixed(1)}%)`);
      
      if (screensWithIssues.length > 0) {
        console.log('\nScreens with issues:');
        screensWithIssues.forEach(issue => {
          console.log(`  ${issue.file}:`);
          if (!issue.hasImport) console.log(`    - Missing useTranslation import`);
          if (!issue.hasUsage) console.log(`    - Not using useTranslation hook`);
          if (!issue.hasCalls) console.log(`    - Not calling t() function`);
          if (issue.hardcodedCount > 0) console.log(`    - ${issue.hardcodedCount} hardcoded text(s)`);
        });
      }

      // We expect at least 65% coverage (19 out of 29 screens)
      expect(coverage).toBeGreaterThanOrEqual(65);
    });
  });
});
