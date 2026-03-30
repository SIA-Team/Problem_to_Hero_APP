import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../i18n/withTranslation';
import { showToast } from '../utils/toast';
import { scaleFont } from '../utils/responsive';
export default function UploadBankScreen({
  navigation
}) {
  const {
    t
  } = useTranslation();
  const [bankName, setBankName] = useState('');
  const [selectedMainCategory, setSelectedMainCategory] = useState('');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [questions, setQuestions] = useState([{
    id: 1,
    title: '',
    type: 'single',
    options: ['', '', '', ''],
    correctAnswer: 0,
    correctAnswers: []
  }]);

  // 类别数据
  const categories = {
    [t('screens.uploadBank.categories.country')]: [t('screens.uploadBank.subCategories.country.politics'), t('screens.uploadBank.subCategories.country.law'), t('screens.uploadBank.subCategories.country.history'), t('screens.uploadBank.subCategories.country.geography'), t('screens.uploadBank.subCategories.country.culture')],
    [t('screens.uploadBank.categories.industry')]: [t('screens.uploadBank.subCategories.industry.internet'), t('screens.uploadBank.subCategories.industry.finance'), t('screens.uploadBank.subCategories.industry.healthcare'), t('screens.uploadBank.subCategories.industry.education'), t('screens.uploadBank.subCategories.industry.manufacturing'), t('screens.uploadBank.subCategories.industry.service')],
    [t('screens.uploadBank.categories.personal')]: [t('screens.uploadBank.subCategories.personal.hobbies'), t('screens.uploadBank.subCategories.personal.lifeSkills'), t('screens.uploadBank.subCategories.personal.careerDevelopment'), t('screens.uploadBank.subCategories.personal.health'), t('screens.uploadBank.subCategories.personal.investment')]
  };
  const questionTypes = [{
    value: 'judge',
    label: t('screens.uploadBank.questionTypes.judge')
  }, {
    value: 'single',
    label: t('screens.uploadBank.questionTypes.single')
  }, {
    value: 'multiple',
    label: t('screens.uploadBank.questionTypes.multiple')
  }];
  const addQuestion = () => {
    const newQuestion = {
      id: questions.length + 1,
      title: '',
      type: 'single',
      options: ['', '', '', ''],
      correctAnswer: 0,
      correctAnswers: []
    };
    setQuestions([...questions, newQuestion]);
  };
  const removeQuestion = id => {
    if (questions.length === 1) {
      showToast(t('screens.uploadBank.alerts.minQuestions'), 'warning');
      return;
    }
    setQuestions(questions.filter(q => q.id !== id));
  };
  const updateQuestion = (id, field, value) => {
    setQuestions(questions.map(q => {
      if (q.id === id) {
        // 切换题目类型时重置答案
        if (field === 'type') {
          return {
            ...q,
            [field]: value,
            correctAnswer: 0,
            correctAnswers: []
          };
        }
        return {
          ...q,
          [field]: value
        };
      }
      return q;
    }));
  };

  // 多选题答案切换
  const toggleMultipleAnswer = (questionId, optionIndex) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.type === 'multiple') {
        const correctAnswers = q.correctAnswers || [];
        const index = correctAnswers.indexOf(optionIndex);
        const newAnswers = index > -1 ? correctAnswers.filter(i => i !== optionIndex) : [...correctAnswers, optionIndex];
        return {
          ...q,
          correctAnswers: newAnswers
        };
      }
      return q;
    }));
  };
  const updateOption = (questionId, optionIndex, value) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return {
          ...q,
          options: newOptions
        };
      }
      return q;
    }));
  };
  const addOption = questionId => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options.length < 6) {
        return {
          ...q,
          options: [...q.options, '']
        };
      }
      return q;
    }));
  };
  const removeOption = (questionId, optionIndex) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options.length > 2) {
        const newOptions = q.options.filter((_, index) => index !== optionIndex);
        return {
          ...q,
          options: newOptions,
          correctAnswer: q.correctAnswer >= optionIndex && q.correctAnswer > 0 ? q.correctAnswer - 1 : q.correctAnswer
        };
      }
      return q;
    }));
  };
  const handleSubmit = () => {
    if (!bankName.trim()) {
      showToast(t('screens.uploadBank.alerts.enterBankName'), 'warning');
      return;
    }
    if (!selectedMainCategory || !selectedSubCategory) {
      showToast(t('screens.uploadBank.alerts.selectCategory'), 'warning');
      return;
    }
    const invalidQuestions = questions.filter(q => !q.title.trim());
    if (invalidQuestions.length > 0) {
      showToast(t('screens.uploadBank.alerts.completeQuestions'), 'warning');
      return;
    }
    showToast(t('screens.uploadBank.alerts.uploadSuccess'), 'success');
    navigation.goBack();
  };
  const renderQuestion = (question, index) => <View key={question.id} style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionNumber}>{t('screens.uploadBank.questionNumber')} {index + 1}</Text>
        <TouchableOpacity onPress={() => removeQuestion(question.id)} style={styles.removeQuestionBtn}>
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* 题目类型 */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('screens.uploadBank.questionType')}</Text>
        <View style={styles.typeSelector}>
          {questionTypes.map(type => <TouchableOpacity key={type.value} style={[styles.typeOption, question.type === type.value && styles.typeOptionActive]} onPress={() => updateQuestion(question.id, 'type', type.value)}>
              <Text style={[styles.typeOptionText, question.type === type.value && styles.typeOptionTextActive]}>
                {type.label}
              </Text>
            </TouchableOpacity>)}
        </View>
      </View>

      {/* 题目标题 */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>{t('screens.uploadBank.questionContent')} <Text style={styles.required}>{t('screens.uploadBank.required')}</Text></Text>
        <TextInput style={styles.textArea} placeholder={t('screens.uploadBank.placeholders.questionContent')} placeholderTextColor="#9ca3af" value={question.title} onChangeText={text => updateQuestion(question.id, 'title', text)} multiline textAlignVertical="top" />
      </View>

      {/* 判断题选项 */}
      {question.type === 'judge' && <View style={styles.formGroup}>
          <Text style={styles.label}>{t('screens.uploadBank.correctAnswer')}</Text>
          <View style={styles.judgeOptions}>
            <TouchableOpacity style={[styles.judgeOption, question.correctAnswer === 0 && styles.judgeOptionActive]} onPress={() => updateQuestion(question.id, 'correctAnswer', 0)}>
              <Ionicons name={question.correctAnswer === 0 ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={question.correctAnswer === 0 ? '#22c55e' : '#9ca3af'} />
              <Text style={[styles.judgeOptionText, question.correctAnswer === 0 && styles.judgeOptionTextActive]}>
                {t('screens.uploadBank.judgeOptions.correct')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.judgeOption, question.correctAnswer === 1 && styles.judgeOptionActive]} onPress={() => updateQuestion(question.id, 'correctAnswer', 1)}>
              <Ionicons name={question.correctAnswer === 1 ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={question.correctAnswer === 1 ? '#22c55e' : '#9ca3af'} />
              <Text style={[styles.judgeOptionText, question.correctAnswer === 1 && styles.judgeOptionTextActive]}>
                {t('screens.uploadBank.judgeOptions.wrong')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>}

      {/* 选择题选项 */}
      {(question.type === 'single' || question.type === 'multiple') && <View style={styles.formGroup}>
          <View style={styles.optionsHeader}>
            <Text style={styles.label}>{t('screens.uploadBank.options')} {question.type === 'multiple' && <Text style={styles.multipleHint}>{t('screens.uploadBank.multipleHint')}</Text>}</Text>
            {question.options.length < 6 && <TouchableOpacity onPress={() => addOption(question.id)} style={styles.addOptionBtn}>
                <Ionicons name="add-circle-outline" size={16} color="#f59e0b" />
                <Text style={styles.addOptionText}>{t('screens.uploadBank.addOption')}</Text>
              </TouchableOpacity>}
          </View>
          {question.options.map((option, optionIndex) => <View key={optionIndex} style={styles.optionRow}>
              <TouchableOpacity style={styles.optionRadio} onPress={() => {
          if (question.type === 'multiple') {
            toggleMultipleAnswer(question.id, optionIndex);
          } else {
            updateQuestion(question.id, 'correctAnswer', optionIndex);
          }
        }}>
                <Ionicons name={question.type === 'multiple' ? question.correctAnswers?.includes(optionIndex) ? 'checkbox' : 'square-outline' : question.correctAnswer === optionIndex ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={question.type === 'multiple' ? question.correctAnswers?.includes(optionIndex) ? '#22c55e' : '#9ca3af' : question.correctAnswer === optionIndex ? '#22c55e' : '#9ca3af'} />
              </TouchableOpacity>
              <TextInput style={styles.optionInput} placeholder={`${t('screens.uploadBank.optionPrefix')} ${String.fromCharCode(65 + optionIndex)}`} placeholderTextColor="#9ca3af" value={option} onChangeText={text => updateOption(question.id, optionIndex, text)} />
              {question.options.length > 2 && <TouchableOpacity onPress={() => removeOption(question.id, optionIndex)} style={styles.removeOptionBtn}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>}
            </View>)}
        </View>}
    </View>;
  return <SafeAreaView style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('screens.uploadBank.title')}</Text>
        <TouchableOpacity onPress={handleSubmit} style={styles.submitBtn} hitSlop={{
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }} activeOpacity={0.7}>
          <Text style={styles.submitBtnText}>{t('screens.uploadBank.submit')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 题库信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('screens.uploadBank.bankInfo')}</Text>
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('screens.uploadBank.bankName')} <Text style={styles.required}>{t('screens.uploadBank.required')}</Text></Text>
            <TextInput style={styles.input} placeholder={t('screens.uploadBank.placeholders.bankName')} placeholderTextColor="#9ca3af" value={bankName} onChangeText={setBankName} />
          </View>

          {/* 题库类别 */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('screens.uploadBank.bankCategory')} <Text style={styles.required}>{t('screens.uploadBank.required')}</Text></Text>
            
            {/* 主类别选择 */}
            <Text style={styles.subLabel}>{t('screens.uploadBank.mainCategory')}</Text>
            <View style={styles.categoryRow}>
              {Object.keys(categories).map(category => <TouchableOpacity key={category} style={[styles.categoryBtn, selectedMainCategory === category && styles.categoryBtnActive]} onPress={() => {
              setSelectedMainCategory(category);
              setSelectedSubCategory('');
            }}>
                  <Text style={[styles.categoryBtnText, selectedMainCategory === category && styles.categoryBtnTextActive]}>
                    {category}
                  </Text>
                </TouchableOpacity>)}
            </View>

            {/* 子类别选择 */}
            {Boolean(selectedMainCategory) && <>
                <Text style={[styles.subLabel, {
              marginTop: 12
            }]}>{t('screens.uploadBank.subCategory')}</Text>
                <View style={styles.subCategoryRow}>
                  {categories[selectedMainCategory].map(subCategory => <TouchableOpacity key={subCategory} style={[styles.subCategoryBtn, selectedSubCategory === subCategory && styles.subCategoryBtnActive]} onPress={() => setSelectedSubCategory(subCategory)}>
                      <Text style={[styles.subCategoryBtnText, selectedSubCategory === subCategory && styles.subCategoryBtnTextActive]}>
                        {subCategory}
                      </Text>
                    </TouchableOpacity>)}
                </View>
              </>}

            {/* 已选择的类别显示 */}
            {Boolean(selectedMainCategory && selectedSubCategory) && <View style={styles.selectedCategoryCard}>
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                <Text style={styles.selectedCategoryText}>
                  {t('screens.uploadBank.selectedCategory')}{selectedMainCategory} - {selectedSubCategory}
                </Text>
              </View>}
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={18} color="#3b82f6" />
            <Text style={styles.infoText}>{t('screens.uploadBank.questionCount')}{questions.length}{t('screens.uploadBank.questionCountUnit')}</Text>
          </View>
        </View>

        {/* 题目列表 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('screens.uploadBank.questionList')}</Text>
            <TouchableOpacity onPress={addQuestion} style={styles.addQuestionBtn}>
              <Ionicons name="add-circle" size={20} color="#f59e0b" />
              <Text style={styles.addQuestionText}>{t('screens.uploadBank.addQuestion')}</Text>
            </TouchableOpacity>
          </View>
          {questions.map((question, index) => renderQuestion(question, index))}
        </View>

        <View style={{
        height: 40
      }} />
      </ScrollView>
    </SafeAreaView>;
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  backBtn: {
    padding: 4
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#1f2937'
  },
  submitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#f59e0b',
    borderRadius: 8
  },
  submitBtnText: {
    fontSize: scaleFont(14),
    color: '#fff',
    fontWeight: '600'
  },
  content: {
    flex: 1
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 16
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12
  },
  formGroup: {
    marginBottom: 16
  },
  label: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8
  },
  required: {
    color: '#ef4444'
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: scaleFont(14),
    color: '#1f2937'
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: scaleFont(14),
    color: '#1f2937',
    minHeight: 80,
    textAlignVertical: 'top'
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8
  },
  infoText: {
    fontSize: scaleFont(13),
    color: '#1e40af'
  },
  addQuestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  addQuestionText: {
    fontSize: scaleFont(13),
    color: '#f59e0b',
    fontWeight: '500'
  },
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  questionNumber: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    color: '#1f2937'
  },
  removeQuestionBtn: {
    padding: 4
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center'
  },
  typeOptionActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#fef3c7'
  },
  typeOptionText: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    fontWeight: '500'
  },
  typeOptionTextActive: {
    color: '#f59e0b',
    fontWeight: '600'
  },
  judgeOptions: {
    flexDirection: 'row',
    gap: 12
  },
  judgeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff'
  },
  judgeOptionActive: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4'
  },
  judgeOptionText: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    fontWeight: '500'
  },
  judgeOptionTextActive: {
    color: '#22c55e',
    fontWeight: '600'
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  addOptionText: {
    fontSize: scaleFont(12),
    color: '#f59e0b',
    fontWeight: '500'
  },
  multipleHint: {
    fontSize: scaleFont(12),
    color: '#3b82f6',
    fontWeight: '400'
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  optionRadio: {
    padding: 4
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: scaleFont(14),
    color: '#1f2937'
  },
  removeOptionBtn: {
    padding: 4
  },
  // 类别选择
  subLabel: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    marginBottom: 8
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8
  },
  categoryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center'
  },
  categoryBtnActive: {
    borderColor: '#f59e0b',
    backgroundColor: '#fef3c7'
  },
  categoryBtnText: {
    fontSize: scaleFont(14),
    color: '#6b7280',
    fontWeight: '500'
  },
  categoryBtnTextActive: {
    color: '#f59e0b',
    fontWeight: '600'
  },
  subCategoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  subCategoryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff'
  },
  subCategoryBtnActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff'
  },
  subCategoryBtnText: {
    fontSize: scaleFont(13),
    color: '#6b7280',
    fontWeight: '500'
  },
  subCategoryBtnTextActive: {
    color: '#3b82f6',
    fontWeight: '600'
  },
  selectedCategoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12
  },
  selectedCategoryText: {
    fontSize: scaleFont(13),
    color: '#166534',
    fontWeight: '500'
  }
});