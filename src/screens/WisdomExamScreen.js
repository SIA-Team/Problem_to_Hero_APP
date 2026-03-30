import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import { formatDuration } from '../utils/timeFormatter';
import { modalTokens } from '../components/modalTokens';

import { scaleFont } from '../utils/responsive';
// 模拟题库
const questionBank = [
  { id: 1, question: 'React Native使用什么语言开发？', options: ['Java', 'JavaScript', 'Python', 'C++'], answer: 1 },
  { id: 2, question: '以下哪个不是React的核心概念？', options: ['组件', '状态', '路由', '生命周期'], answer: 2 },
  { id: 3, question: 'useState是什么类型的Hook？', options: ['Effect Hook', 'State Hook', 'Context Hook', 'Ref Hook'], answer: 1 },
  { id: 4, question: 'JSX是什么的缩写？', options: ['JavaScript XML', 'Java Syntax Extension', 'JSON XML', 'JavaScript Extension'], answer: 0 },
  { id: 5, question: '以下哪个方法用于更新组件状态？', options: ['updateState', 'setState', 'changeState', 'modifyState'], answer: 1 },
  { id: 6, question: 'React Native的样式使用什么单位？', options: ['px', 'em', 'rem', '无单位数字'], answer: 3 },
  { id: 7, question: '以下哪个组件用于显示文本？', options: ['View', 'Text', 'Label', 'Span'], answer: 1 },
  { id: 8, question: 'useEffect的第二个参数是什么？', options: ['回调函数', '依赖数组', '初始值', '配置对象'], answer: 1 },
  { id: 9, question: '以下哪个不是React Native的核心组件？', options: ['View', 'Text', 'Image', 'Div'], answer: 3 },
  { id: 10, question: 'Props是什么的缩写？', options: ['Properties', 'Proposals', 'Protocols', 'Procedures'], answer: 0 },
  { id: 11, question: '以下哪个Hook用于处理副作用？', options: ['useState', 'useEffect', 'useContext', 'useMemo'], answer: 1 },
  { id: 12, question: 'React Native使用什么进行布局？', options: ['CSS Grid', 'Flexbox', 'Table', 'Float'], answer: 1 },
  { id: 13, question: '以下哪个方法用于导航到新页面？', options: ['push', 'navigate', 'goto', 'redirect'], answer: 1 },
  { id: 14, question: 'TouchableOpacity的作用是什么？', options: ['显示图片', '可点击的透明度变化', '输入框', '滚动视图'], answer: 1 },
  { id: 15, question: '以下哪个不是生命周期方法？', options: ['componentDidMount', 'componentWillUpdate', 'render', 'componentCreate'], answer: 3 },
];

export default function WisdomExamScreen({ navigation }) {
  const { t } = useTranslation();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(600); // 10分钟
  const [examStarted, setExamStarted] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false); // 考核说明页面
  const [showConfirmModal, setShowConfirmModal] = useState(false); // 提交确认弹窗
  const [score, setScore] = useState(0);

  // 随机选择10道题
  const [examQuestions] = useState(() => {
    const shuffled = [...questionBank].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 10);
  });

  // 倒计时
  useEffect(() => {
    if (examStarted && !examFinished && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !examFinished) {
      handleSubmit();
    }
  }, [timeLeft, examStarted, examFinished]);

  const handleStartExam = () => {
    setExamStarted(true);
  };

  const handleSelectAnswer = (optionIndex) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestion]: optionIndex
    });
  };

  const handleNext = () => {
    if (currentQuestion < examQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = () => {
    // 计算分数
    let correctCount = 0;
    examQuestions.forEach((q, index) => {
      if (selectedAnswers[index] === q.answer) {
        correctCount++;
      }
    });
    const finalScore = (correctCount / examQuestions.length) * 100;
    setScore(finalScore);
    setShowExplanation(true); // 先显示考核说明
  };

  const handleConfirmResult = () => {
    setShowExplanation(false);
    setExamFinished(true);
  };

  const handleConfirmSubmit = () => {
    setShowConfirmModal(true);
  };

  // 开始前页面
  if (!examStarted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('screens.wisdomExam.title')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.startContainer}>
          <View style={styles.startIcon}>
            <Ionicons name="school" size={64} color="#f59e0b" />
          </View>
          <Text style={styles.startTitle}>{t('screens.wisdomExam.start.title')}</Text>
          <Text style={styles.startDesc}>{t('screens.wisdomExam.start.description')}</Text>

          <View style={styles.rulesCard}>
            <Text style={styles.rulesTitle}>{t('screens.wisdomExam.start.rulesTitle')}</Text>
            <View style={styles.ruleItem}>
              <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              <Text style={styles.ruleText}>{t('screens.wisdomExam.start.rule1')}</Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons name="time" size={20} color="#3b82f6" />
              <Text style={styles.ruleText}>{t('screens.wisdomExam.start.rule2')}</Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons name="trophy" size={20} color="#f59e0b" />
              <Text style={styles.ruleText}>{t('screens.wisdomExam.start.rule3')}</Text>
            </View>
            <View style={styles.ruleItem}>
              <Ionicons name="warning" size={20} color="#ef4444" />
              <Text style={styles.ruleText}>{t('screens.wisdomExam.start.rule4')}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.startBtn} onPress={handleStartExam}>
            <Text style={styles.startBtnText}>{t('screens.wisdomExam.start.startButton')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 结果页面
  if (examFinished) {
    const passed = score >= 60;
    const rank = score >= 90 ? t('screens.wisdomExam.result.rank.excellent') : score >= 80 ? t('screens.wisdomExam.result.rank.good') : score >= 60 ? t('screens.wisdomExam.result.rank.pass') : t('screens.wisdomExam.result.rank.fail');

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('screens.wisdomExam.result.title')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.resultContainer}>
          <View style={[styles.resultIcon, { backgroundColor: passed ? '#dcfce7' : '#fee2e2' }]}>
            <Ionicons name={passed ? "checkmark-circle" : "close-circle"} size={80} color={passed ? '#22c55e' : '#ef4444'} />
          </View>

          <Text style={styles.resultTitle}>{passed ? t('screens.wisdomExam.result.passed') : t('screens.wisdomExam.result.failed')}</Text>
          <Text style={styles.resultScore}>{score.toFixed(0)}{t('screens.wisdomIndex.avgScore.unit')}</Text>
          <Text style={styles.resultRank}>{rank}</Text>

          <View style={styles.resultStats}>
            <View style={styles.resultStatItem}>
              <Text style={styles.resultStatValue}>{examQuestions.length}</Text>
              <Text style={styles.resultStatLabel}>{t('screens.wisdomExam.result.totalQuestions')}</Text>
            </View>
            <View style={styles.resultStatItem}>
              <Text style={[styles.resultStatValue, { color: '#22c55e' }]}>
                {Object.keys(selectedAnswers).filter(key => selectedAnswers[key] === examQuestions[key].answer).length}
              </Text>
              <Text style={styles.resultStatLabel}>{t('screens.wisdomExam.result.correct')}</Text>
            </View>
            <View style={styles.resultStatItem}>
              <Text style={[styles.resultStatValue, { color: '#ef4444' }]}>
                {examQuestions.length - Object.keys(selectedAnswers).filter(key => selectedAnswers[key] === examQuestions[key].answer).length}
              </Text>
              <Text style={styles.resultStatLabel}>{t('screens.wisdomExam.result.wrong')}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.resultBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.resultBtnText}>{t('screens.wisdomExam.result.backButton')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.resultSecondaryBtn}
            onPress={() => {
              setExamStarted(false);
              setExamFinished(false);
              setShowExplanation(false);
              setCurrentQuestion(0);
              setSelectedAnswers({});
              setTimeLeft(600);
            }}
          >
            <Text style={styles.resultSecondaryBtnText}>{t('screens.wisdomExam.result.retryButton')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 考核说明页面（提交后显示）
  if (showExplanation) {
    const passed = score >= 60;
    const correctCount = Object.keys(selectedAnswers).filter(key => selectedAnswers[key] === examQuestions[key].answer).length;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ width: 24 }} />
          <Text style={styles.headerTitle}>{t('screens.wisdomExam.explanation.title')}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.explanationContainer}>
          <View style={styles.explanationIcon}>
            <Ionicons name="information-circle" size={64} color="#3b82f6" />
          </View>

          <Text style={styles.explanationTitle}>{t('screens.wisdomExam.explanation.completed')}</Text>
          <Text style={styles.explanationDesc}>{t('screens.wisdomExam.explanation.description')}</Text>

          <View style={styles.explanationCard}>
            <Text style={styles.explanationCardTitle}>{t('screens.wisdomExam.explanation.overviewTitle')}</Text>
            
            <View style={styles.explanationRow}>
              <Text style={styles.explanationLabel}>{t('screens.wisdomExam.explanation.examTime')}</Text>
              <Text style={styles.explanationValue}>{formatDuration(600 - timeLeft)}</Text>
            </View>

            <View style={styles.explanationRow}>
              <Text style={styles.explanationLabel}>{t('screens.wisdomExam.explanation.answeredCount')}</Text>
              <Text style={styles.explanationValue}>{Object.keys(selectedAnswers).length}/{examQuestions.length}</Text>
            </View>

            <View style={styles.explanationRow}>
              <Text style={styles.explanationLabel}>{t('screens.wisdomExam.explanation.correctCount')}</Text>
              <Text style={[styles.explanationValue, { color: '#22c55e' }]}>{correctCount}</Text>
            </View>

            <View style={styles.explanationRow}>
              <Text style={styles.explanationLabel}>{t('screens.wisdomExam.explanation.estimatedScore')}</Text>
              <Text style={[styles.explanationValue, { color: '#f59e0b', fontWeight: 'bold' }]}>{score.toFixed(0)}{t('screens.wisdomIndex.avgScore.unit')}</Text>
            </View>
          </View>

          <View style={styles.explanationNotice}>
            <Ionicons name="bulb" size={20} color="#f59e0b" />
            <View style={styles.explanationNoticeContent}>
              <Text style={styles.explanationNoticeTitle}>{t('screens.wisdomExam.explanation.wisdomNoticeTitle')}</Text>
              <Text style={styles.explanationNoticeText}>
                {t('screens.wisdomExam.explanation.wisdomNoticeText')}
              </Text>
            </View>
          </View>

          <View style={styles.explanationTips}>
            <Text style={styles.explanationTipsTitle}>{t('screens.wisdomExam.explanation.tipsTitle')}</Text>
            <Text style={styles.explanationTipsText}>{t('screens.wisdomExam.explanation.tip1')}</Text>
            <Text style={styles.explanationTipsText}>{t('screens.wisdomExam.explanation.tip2')}</Text>
            <Text style={styles.explanationTipsText}>{t('screens.wisdomExam.explanation.tip3')}</Text>
          </View>

          <TouchableOpacity 
            style={styles.explanationBtn}
            onPress={handleConfirmResult}
          >
            <Text style={styles.explanationBtnText}>{t('screens.wisdomExam.explanation.viewResultButton')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 考试页面
  const question = examQuestions[currentQuestion];
  const progress = ((currentQuestion + 1) / examQuestions.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.wisdomExam.title')}</Text>
        <View style={styles.timerBadge}>
          <Ionicons name="time" size={16} color="#ef4444" />
          <Text style={styles.timerText}>{formatDuration(timeLeft)}</Text>
        </View>
      </View>

      {/* 进度条 */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <ScrollView style={styles.examContent}>
        {/* 题目卡片 */}
        <View style={styles.questionCard}>
          <View style={styles.questionHeader}>
            <Text style={styles.questionNumber}>{t('screens.wisdomExam.exam.questionNumber', { number: currentQuestion + 1 })}</Text>
            <Text style={styles.questionCount}>{t('screens.wisdomExam.exam.questionCount', { current: currentQuestion + 1, total: examQuestions.length })}</Text>
          </View>
          <Text style={styles.questionText}>{question.question}</Text>
        </View>

        {/* 选项 */}
        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.optionItem,
                selectedAnswers[currentQuestion] === index && styles.optionItemSelected
              ]}
              onPress={() => handleSelectAnswer(index)}
            >
              <View style={[
                styles.optionRadio,
                selectedAnswers[currentQuestion] === index && styles.optionRadioSelected
              ]}>
                {selectedAnswers[currentQuestion] === index && (
                  <View style={styles.optionRadioDot} />
                )}
              </View>
              <Text style={[
                styles.optionText,
                selectedAnswers[currentQuestion] === index && styles.optionTextSelected
              ]}>
                {String.fromCharCode(65 + index)}. {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 答题卡 */}
        <View style={styles.answerSheet}>
          <Text style={styles.answerSheetTitle}>{t('screens.wisdomExam.exam.answerSheet')}</Text>
          <View style={styles.answerSheetGrid}>
            {examQuestions.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.answerSheetItem,
                  currentQuestion === index && styles.answerSheetItemCurrent,
                  selectedAnswers[index] !== undefined && styles.answerSheetItemAnswered
                ]}
                onPress={() => setCurrentQuestion(index)}
              >
                <Text style={[
                  styles.answerSheetItemText,
                  currentQuestion === index && styles.answerSheetItemTextCurrent,
                  selectedAnswers[index] !== undefined && styles.answerSheetItemTextAnswered
                ]}>
                  {index + 1}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* 底部按钮 */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerBtn, currentQuestion === 0 && styles.footerBtnDisabled]}
          onPress={handlePrevious}
          disabled={currentQuestion === 0}
        >
          <Ionicons name="chevron-back" size={20} color={currentQuestion === 0 ? '#9ca3af' : '#374151'} />
          <Text style={[styles.footerBtnText, currentQuestion === 0 && styles.footerBtnTextDisabled]}>{t('screens.wisdomExam.exam.previous')}</Text>
        </TouchableOpacity>

        {currentQuestion === examQuestions.length - 1 ? (
          <TouchableOpacity style={styles.submitBtn} onPress={handleConfirmSubmit}>
            <Text style={styles.submitBtnText}>{t('screens.wisdomExam.exam.submit')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>{t('screens.wisdomExam.exam.next')}</Text>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* 提交确认弹窗 */}
      <Modal visible={showConfirmModal} animationType="fade" transparent>
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmModalIcon}>
              <Ionicons name="alert-circle" size={56} color="#f59e0b" />
            </View>
            <Text style={styles.confirmModalTitle}>{t('screens.wisdomExam.confirmModal.title')}</Text>
            <Text style={styles.confirmModalDesc}>
              {t('screens.wisdomExam.confirmModal.description')}
            </Text>
            <View style={styles.confirmModalStats}>
              <View style={styles.confirmModalStatItem}>
                <Text style={styles.confirmModalStatLabel}>{t('screens.wisdomExam.confirmModal.answeredLabel')}</Text>
                <Text style={styles.confirmModalStatValue}>
                  {Object.keys(selectedAnswers).length}/{examQuestions.length}
                </Text>
              </View>
              <View style={styles.confirmModalStatDivider} />
              <View style={styles.confirmModalStatItem}>
                <Text style={styles.confirmModalStatLabel}>{t('screens.wisdomExam.confirmModal.timeLeftLabel')}</Text>
                <Text style={styles.confirmModalStatValue}>{formatDuration(timeLeft)}</Text>
              </View>
            </View>
            <View style={styles.confirmModalButtons}>
              <TouchableOpacity 
                style={styles.confirmModalCancelBtn}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.confirmModalCancelText}>{t('screens.wisdomExam.confirmModal.cancelButton')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.confirmModalConfirmBtn}
                onPress={() => {
                  setShowConfirmModal(false);
                  handleSubmit();
                }}
              >
                <Text style={styles.confirmModalConfirmText}>{t('screens.wisdomExam.confirmModal.confirmButton')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: scaleFont(18), fontWeight: '600', color: '#1f2937' },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  timerText: { fontSize: scaleFont(14), fontWeight: '600', color: '#ef4444' },

  // 开始页面
  startContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  startIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  startTitle: { fontSize: scaleFont(28), fontWeight: 'bold', color: '#1f2937', marginBottom: 8 },
  startDesc: { fontSize: scaleFont(16), color: '#6b7280', marginBottom: 32 },
  rulesCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', marginBottom: 32 },
  rulesTitle: { fontSize: scaleFont(18), fontWeight: '600', color: '#1f2937', marginBottom: 16 },
  ruleItem: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  ruleText: { fontSize: scaleFont(14), color: '#374151', flex: 1 },
  startBtn: { backgroundColor: '#f59e0b', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 12, width: '100%' },
  startBtnText: { fontSize: scaleFont(16), color: '#fff', fontWeight: '600', textAlign: 'center' },

  // 进度条
  progressBar: { height: 4, backgroundColor: '#e5e7eb' },
  progressFill: { height: '100%', backgroundColor: '#f59e0b' },

  // 考试内容
  examContent: { flex: 1, padding: 16 },
  questionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16 },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  questionNumber: { fontSize: scaleFont(14), fontWeight: '600', color: '#f59e0b' },
  questionCount: { fontSize: scaleFont(14), color: '#9ca3af' },
  questionText: { fontSize: scaleFont(18), color: '#1f2937', lineHeight: scaleFont(28) },

  // 选项
  optionsContainer: { marginBottom: 16 },
  optionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 2, borderColor: '#e5e7eb' },
  optionItemSelected: { borderColor: '#f59e0b', backgroundColor: '#fef3c7' },
  optionRadio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#d1d5db', marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  optionRadioSelected: { borderColor: '#f59e0b' },
  optionRadioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#f59e0b' },
  optionText: { fontSize: scaleFont(16), color: '#374151', flex: 1 },
  optionTextSelected: { color: '#92400e', fontWeight: '500' },

  // 答题卡
  answerSheet: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16 },
  answerSheetTitle: { fontSize: scaleFont(16), fontWeight: '600', color: '#1f2937', marginBottom: 16 },
  answerSheetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  answerSheetItem: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  answerSheetItemCurrent: { borderColor: '#f59e0b' },
  answerSheetItemAnswered: { backgroundColor: '#dcfce7' },
  answerSheetItemText: { fontSize: scaleFont(14), color: '#6b7280', fontWeight: '500' },
  answerSheetItemTextCurrent: { color: '#f59e0b', fontWeight: '600' },
  answerSheetItemTextAnswered: { color: '#22c55e' },

  // 底部按钮
  footer: { flexDirection: 'row', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f3f4f6', gap: 12 },
  footerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f3f4f6', gap: 4 },
  footerBtnDisabled: { opacity: 0.5 },
  footerBtnText: { fontSize: scaleFont(15), color: '#374151', fontWeight: '500' },
  footerBtnTextDisabled: { color: '#9ca3af' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f59e0b', gap: 4 },
  nextBtnText: { fontSize: scaleFont(15), color: '#fff', fontWeight: '600' },
  submitBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { fontSize: scaleFont(15), color: '#fff', fontWeight: '600' },

  // 结果页面
  resultContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  resultIcon: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  resultTitle: { fontSize: scaleFont(28), fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  resultScore: { fontSize: scaleFont(64), fontWeight: 'bold', color: '#f59e0b', marginBottom: 8 },
  resultRank: { fontSize: scaleFont(20), color: '#6b7280', marginBottom: 32 },
  resultStats: { flexDirection: 'row', gap: 24, marginBottom: 32 },
  resultStatItem: { alignItems: 'center' },
  resultStatValue: { fontSize: scaleFont(32), fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  resultStatLabel: { fontSize: scaleFont(14), color: '#9ca3af' },
  resultBtn: { backgroundColor: '#f59e0b', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 12, width: '100%', marginBottom: 12 },
  resultBtnText: { fontSize: scaleFont(16), color: '#fff', fontWeight: '600', textAlign: 'center' },
  resultSecondaryBtn: { backgroundColor: '#fff', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 12, width: '100%', borderWidth: 1, borderColor: '#e5e7eb' },
  resultSecondaryBtnText: { fontSize: scaleFont(16), color: '#374151', fontWeight: '500', textAlign: 'center' },

  // 考核说明页面
  explanationContainer: { flex: 1, padding: 24 },
  explanationIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 24, marginTop: 20 },
  explanationTitle: { fontSize: scaleFont(24), fontWeight: 'bold', color: '#1f2937', textAlign: 'center', marginBottom: 8 },
  explanationDesc: { fontSize: scaleFont(15), color: '#6b7280', textAlign: 'center', marginBottom: 32 },
  explanationCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  explanationCardTitle: { fontSize: scaleFont(16), fontWeight: '600', color: '#1f2937', marginBottom: 16 },
  explanationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  explanationLabel: { fontSize: scaleFont(14), color: '#6b7280' },
  explanationValue: { fontSize: scaleFont(15), color: '#1f2937', fontWeight: '500' },
  explanationNotice: { flexDirection: 'row', backgroundColor: '#fef3c7', borderRadius: 12, padding: 16, marginBottom: 20, gap: 12 },
  explanationNoticeContent: { flex: 1 },
  explanationNoticeTitle: { fontSize: scaleFont(14), fontWeight: '600', color: '#92400e', marginBottom: 4 },
  explanationNoticeText: { fontSize: scaleFont(13), color: '#92400e', lineHeight: scaleFont(20) },
  explanationTips: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 24 },
  explanationTipsTitle: { fontSize: scaleFont(14), fontWeight: '600', color: '#374151', marginBottom: 12 },
  explanationTipsText: { fontSize: scaleFont(13), color: '#6b7280', lineHeight: scaleFont(22), marginBottom: 4 },
  explanationBtn: { backgroundColor: '#f59e0b', paddingVertical: 16, borderRadius: 12 },
  explanationBtnText: { fontSize: scaleFont(16), color: '#fff', fontWeight: '600', textAlign: 'center' },

  // 提交确认弹窗
  confirmModalOverlay: { flex: 1, backgroundColor: modalTokens.overlay, justifyContent: 'center', alignItems: 'center', padding: 20 },
  confirmModal: { backgroundColor: modalTokens.surface, borderRadius: 20, borderWidth: 1, borderColor: modalTokens.border, padding: 28, width: '100%', maxWidth: 400, alignItems: 'center', shadowColor: modalTokens.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  confirmModalIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  confirmModalTitle: { fontSize: scaleFont(22), fontWeight: 'bold', color: modalTokens.textPrimary, marginBottom: 12 },
  confirmModalDesc: { fontSize: scaleFont(15), color: modalTokens.textSecondary, textAlign: 'center', lineHeight: scaleFont(24), marginBottom: 24 },
  confirmModalStats: { flexDirection: 'row', backgroundColor: modalTokens.surfaceSoft, borderRadius: 12, borderWidth: 1, borderColor: modalTokens.border, padding: 16, width: '100%', marginBottom: 24 },
  confirmModalStatItem: { flex: 1, alignItems: 'center' },
  confirmModalStatLabel: { fontSize: scaleFont(13), color: modalTokens.textMuted, marginBottom: 6 },
  confirmModalStatValue: { fontSize: scaleFont(18), fontWeight: 'bold', color: modalTokens.textPrimary },
  confirmModalStatDivider: { width: 1, backgroundColor: modalTokens.border, marginHorizontal: 16 },
  confirmModalButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  confirmModalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: modalTokens.surfaceMuted, alignItems: 'center', borderWidth: 1, borderColor: modalTokens.border },
  confirmModalCancelText: { fontSize: scaleFont(15), color: modalTokens.textSecondary, fontWeight: '600' },
  confirmModalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f59e0b', alignItems: 'center', shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  confirmModalConfirmText: { fontSize: scaleFont(15), color: '#fff', fontWeight: '600' },
});
