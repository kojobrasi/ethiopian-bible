import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, HelpCircle, CheckCircle, XCircle, Trophy } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';

type Question = {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

const QUESTIONS: Question[] = [
  { question: 'Who built the ark according to Genesis?', options: ['Abraham', 'Moses', 'Noah', 'David'], correct: 2, explanation: 'Genesis 6 records God commanding Noah to build the ark.' },
  { question: 'How many books are in the Old Testament?', options: ['27', '39', '46', '66'], correct: 1, explanation: 'The Protestant Old Testament contains 39 books.' },
  { question: 'What was the first miracle Jesus performed?', options: ['Healing a leper', 'Raising Lazarus', 'Feeding 5,000', 'Water into wine'], correct: 3, explanation: 'John 2 records Jesus turning water into wine at Cana.' },
  { question: 'Who wrote the majority of the New Testament epistles?', options: ['Peter', 'John', 'Paul', 'James'], correct: 2, explanation: 'The Apostle Paul wrote 13 epistles in the New Testament.' },
  { question: 'In which city was Jesus born?', options: ['Jerusalem', 'Nazareth', 'Bethlehem', 'Jericho'], correct: 2, explanation: 'Jesus was born in Bethlehem as foretold by Micah 5:2.' },
  { question: 'What does "Immanuel" mean?', options: ['God saves', 'God with us', 'God is great', 'Prince of Peace'], correct: 1, explanation: 'Immanuel means "God with us" (Isaiah 7:14, Matthew 1:23).' },
  { question: 'How many disciples did Jesus choose?', options: ['7', '10', '12', '70'], correct: 2, explanation: 'Jesus chose 12 disciples (apostles) as recorded in Matthew 10.' },
  { question: 'Which Psalm begins "The Lord is my shepherd"?', options: ['Psalm 1', 'Psalm 22', 'Psalm 23', 'Psalm 100'], correct: 2, explanation: 'Psalm 23 is the famous shepherd Psalm of David.' },
  { question: 'Who was the first king of Israel?', options: ['David', 'Solomon', 'Saul', 'Samuel'], correct: 2, explanation: 'Saul was anointed as the first king of Israel (1 Samuel 10).' },
  { question: 'What did Jesus say is the greatest commandment?', options: ['Keep the Sabbath', 'Honor thy parents', 'Love God with all your heart', 'Do not murder'], correct: 2, explanation: 'Matthew 22:37 — love the Lord your God with all your heart.' },
];

type State = 'idle' | 'playing' | 'finished';

export default function QuizzesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<State>('idle');
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [saving, setSaving] = useState(false);

  const q = QUESTIONS[current];
  const isAnswered = selected !== null;

  const handleStart = () => {
    setState('playing');
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setAnswers([]);
  };

  const handleAnswer = (idx: number) => {
    if (isAnswered) return;
    setSelected(idx);
    const correct = idx === q.correct;
    if (correct) setScore((s) => s + 1);
    setAnswers((prev) => [...prev, correct]);
  };

  const handleNext = useCallback(async () => {
    if (current === QUESTIONS.length - 1) {
      setState('finished');
      setSaving(true);
      await supabase.from('quiz_scores').insert({
        category: 'General Bible',
        score: score + (selected === q.correct ? 1 : 0),
        total: QUESTIONS.length,
      });
      setSaving(false);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
    }
  }, [current, score, selected, q]);

  const finalScore = answers.filter(Boolean).length;
  const pct = Math.round((finalScore / QUESTIONS.length) * 100);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <LinearGradient colors={[Colors.bg.secondary, Colors.bg.primary]} style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color={Colors.text.secondary} />
          </TouchableOpacity>
          <HelpCircle size={16} color="#E67E22" />
          <Text style={styles.title}>Bible Quiz</Text>
          {state === 'playing' && (
            <View style={styles.progress}>
              <Text style={styles.progressText}>{current + 1}/{QUESTIONS.length}</Text>
            </View>
          )}
        </View>
        <View style={styles.divider} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {state === 'idle' && (
          <View style={styles.idleCard}>
            <View style={styles.trophyIcon}>
              <Trophy size={48} color={Colors.gold.primary} strokeWidth={1.5} />
            </View>
            <Text style={styles.idleTitle}>Bible Trivia</Text>
            <Text style={styles.idleSubtitle}>{QUESTIONS.length} questions · General Knowledge</Text>
            <Text style={styles.idleDesc}>
              Test your knowledge of the Bible! Answer questions about key events, people, and teachings.
            </Text>
            <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
              <Text style={styles.startBtnText}>Start Quiz</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'playing' && (
          <View style={styles.quizArea}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${((current + 1) / QUESTIONS.length) * 100}%` }]} />
            </View>

            <View style={styles.scoreRow}>
              <Text style={styles.scoreText}>Score: {score}</Text>
              <Text style={styles.questionNum}>Question {current + 1} of {QUESTIONS.length}</Text>
            </View>

            <View style={styles.questionCard}>
              <Text style={styles.questionText}>{q.question}</Text>
            </View>

            <View style={styles.options}>
              {q.options.map((opt, i) => {
                let optStyle = styles.option;
                let textStyle = styles.optionText;
                if (isAnswered) {
                  if (i === q.correct) { optStyle = { ...styles.option, ...styles.optionCorrect } as any; textStyle = { ...styles.optionText, color: '#fff' } as any; }
                  else if (i === selected && i !== q.correct) { optStyle = { ...styles.option, ...styles.optionWrong } as any; textStyle = { ...styles.optionText, color: '#fff' } as any; }
                  else { optStyle = { ...styles.option, opacity: 0.4 } as any; }
                }
                return (
                  <TouchableOpacity key={i} style={optStyle} onPress={() => handleAnswer(i)} activeOpacity={isAnswered ? 1 : 0.7}>
                    <View style={styles.optionLeft}>
                      <View style={styles.optionLetter}><Text style={styles.optionLetterText}>{String.fromCharCode(65 + i)}</Text></View>
                      <Text style={textStyle}>{opt}</Text>
                    </View>
                    {isAnswered && i === q.correct && <CheckCircle size={18} color="#fff" />}
                    {isAnswered && i === selected && i !== q.correct && <XCircle size={18} color="#fff" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {isAnswered && (
              <View style={styles.explanationCard}>
                <Text style={styles.explanationText}>{q.explanation}</Text>
              </View>
            )}

            {isAnswered && (
              <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
                <Text style={styles.nextBtnText}>
                  {current === QUESTIONS.length - 1 ? 'See Results' : 'Next Question'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {state === 'finished' && (
          <View style={styles.resultsCard}>
            <Trophy size={56} color={pct >= 70 ? Colors.gold.primary : Colors.text.muted} strokeWidth={1.5} />
            <Text style={styles.resultTitle}>{pct >= 90 ? 'Excellent!' : pct >= 70 ? 'Well done!' : pct >= 50 ? 'Good effort!' : 'Keep studying!'}</Text>
            <Text style={styles.resultScore}>{finalScore} / {QUESTIONS.length}</Text>
            <Text style={styles.resultPct}>{pct}%</Text>

            <View style={styles.answerSummary}>
              {answers.map((correct, i) => (
                <View key={i} style={[styles.answerDot, { backgroundColor: correct ? Colors.status.success : Colors.status.error }]} />
              ))}
            </View>

            {saving && <ActivityIndicator color={Colors.gold.primary} style={{ marginTop: Spacing.md }} />}

            <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
              <Text style={styles.startBtnText}>Play Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineBtn} onPress={() => router.back()}>
              <Text style={styles.outlineBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.primary },
  progress: { backgroundColor: Colors.bg.card, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  progressText: { fontSize: Typography.size.sm, color: Colors.gold.light, fontWeight: Typography.weight.bold },
  divider: { height: 1, backgroundColor: Colors.border.subtle },
  content: { padding: Spacing.lg, paddingTop: Spacing.xl },
  idleCard: { alignItems: 'center', gap: Spacing.lg, paddingTop: Spacing.xl },
  trophyIcon: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.gold.subtle, borderWidth: 1, borderColor: Colors.gold.muted, alignItems: 'center', justifyContent: 'center' },
  idleTitle: { fontSize: Typography.size.xxxl, fontWeight: Typography.weight.extrabold, color: Colors.text.primary },
  idleSubtitle: { fontSize: Typography.size.sm, color: Colors.gold.primary },
  idleDesc: { fontSize: Typography.size.base, color: Colors.text.secondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: Spacing.xl },
  startBtn: { width: '100%', backgroundColor: Colors.gold.primary, borderRadius: Radius.lg, paddingVertical: Spacing.lg, alignItems: 'center' },
  startBtnText: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.inverse },
  quizArea: { gap: Spacing.lg },
  progressBar: { height: 6, backgroundColor: Colors.bg.card, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.gold.primary, borderRadius: 3 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between' },
  scoreText: { fontSize: Typography.size.sm, color: Colors.gold.light, fontWeight: Typography.weight.bold },
  questionNum: { fontSize: Typography.size.sm, color: Colors.text.muted },
  questionCard: { backgroundColor: Colors.bg.card, borderRadius: Radius.xl, padding: Spacing.xl, borderWidth: 1, borderColor: Colors.border.default },
  questionText: { fontSize: Typography.size.xl, fontWeight: Typography.weight.semibold, color: Colors.text.primary, lineHeight: 28, textAlign: 'center' },
  options: { gap: Spacing.md },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.bg.card, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border.default },
  optionCorrect: { backgroundColor: Colors.status.success, borderColor: Colors.status.success },
  optionWrong: { backgroundColor: Colors.status.error, borderColor: Colors.status.error },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  optionLetter: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.bg.elevated, alignItems: 'center', justifyContent: 'center' },
  optionLetterText: { fontSize: Typography.size.sm, fontWeight: Typography.weight.bold, color: Colors.text.secondary },
  optionText: { fontSize: Typography.size.base, color: Colors.text.primary, flex: 1 },
  explanationCard: { backgroundColor: Colors.bg.elevated, borderRadius: Radius.lg, padding: Spacing.md, borderLeftWidth: 3, borderLeftColor: Colors.gold.primary },
  explanationText: { fontSize: Typography.size.sm, color: Colors.text.secondary, lineHeight: 20, fontStyle: 'italic' },
  nextBtn: { backgroundColor: Colors.gold.primary, borderRadius: Radius.lg, paddingVertical: Spacing.md, alignItems: 'center' },
  nextBtnText: { fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, color: Colors.text.inverse },
  resultsCard: { alignItems: 'center', gap: Spacing.lg, paddingTop: Spacing.xl },
  resultTitle: { fontSize: Typography.size.xxl, fontWeight: Typography.weight.extrabold, color: Colors.text.primary },
  resultScore: { fontSize: Typography.size.display, fontWeight: Typography.weight.extrabold, color: Colors.gold.primary },
  resultPct: { fontSize: Typography.size.xl, color: Colors.text.secondary },
  answerSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  answerDot: { width: 18, height: 18, borderRadius: 9 },
  outlineBtn: { width: '100%', borderRadius: Radius.lg, paddingVertical: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border.bright },
  outlineBtnText: { fontSize: Typography.size.base, color: Colors.text.secondary, fontWeight: Typography.weight.medium },
});
