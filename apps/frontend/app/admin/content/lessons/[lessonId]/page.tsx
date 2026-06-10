'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import { api } from '@/lib/api';
import { 
  ChevronLeft, Save, Loader2, AlertCircle, 
  HelpCircle, Settings, FileText, Code2, Play, 
  Plus, Edit, Trash, Check, X, FileQuestion, BookOpen
} from 'lucide-react';

interface Track {
  id: string;
  name: string;
  level: number;
}

interface Module {
  id: string;
  name: string;
  trackId: string;
  track?: Track;
}

interface Question {
  id: string;
  type: string;
  content: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  order: number;
}

interface Quiz {
  id: string;
  title: string;
  passingScore: number;
  isRequired: boolean;
  questions: Question[];
}

interface Lesson {
  id: string;
  slug: string;
  title: string;
  content: string;
  estimatedMin: number;
  difficulty: string;
  tags: string[];
  companies: string[];
  isPublished: boolean;
  moduleId: string;
  quizzes: Quiz[];
}

export default function AdminEditLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = use(params);
  const router = useRouter();

  // App & Metadata State
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  
  // Editor Tabs
  const [activeCenterTab, setActiveCenterTab] = useState<'content' | 'quiz'>('content');

  // Form states for lesson details
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [difficulty, setDifficulty] = useState('beginner');
  const [estimatedMin, setEstimatedMin] = useState(10);
  const [tagsInput, setTagsInput] = useState('');
  const [companiesInput, setCompaniesInput] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  
  // Editor Content
  const [content, setContent] = useState('');

  // Quiz states
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  
  // Question Modal form state
  const [qContent, setQContent] = useState('');
  const [qOptA, setQOptA] = useState('');
  const [qOptB, setQOptB] = useState('');
  const [qOptC, setQOptC] = useState('');
  const [qOptD, setQOptD] = useState('');
  const [qCorrect, setQCorrect] = useState('A');
  const [qExplanation, setQExplanation] = useState('');

  // Status
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load lesson & structures
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [lessonRes, tracksRes] = await Promise.all([
        api.get(`/admin/lessons/${lessonId}`),
        api.get('/admin/tracks')
      ]);

      const lData = lessonRes.data.data;
      setLesson(lData);
      
      // Populate fields
      setTitle(lData.title);
      setSlug(lData.slug);
      setSelectedModuleId(lData.moduleId);
      setDifficulty(lData.difficulty);
      setEstimatedMin(lData.estimatedMin);
      setContent(lData.content);
      setTagsInput((lData.tags || []).join(', '));
      setCompaniesInput((lData.companies || []).join(', '));
      setIsPublished(lData.isPublished);

      const tracksList = tracksRes.data.data || [];
      setTracks(tracksList);

      // Collect all modules
      const allModules: Module[] = [];
      for (const t of tracksList) {
        try {
          const detailRes = await api.get(`/admin/tracks/${t.id}`);
          const modulesOfTrack = detailRes.data.data?.modules || [];
          modulesOfTrack.forEach((m: any) => {
            allModules.push({ ...m, track: t });
          });
        } catch (e) {
          console.error(e);
        }
      }
      setModules(allModules);

    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [lessonId]);

  // Update Lesson Metadata & Content
  const handleSaveLesson = async () => {
    setSaving(true);
    setError(null);

    const tags = tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    const companies = companiesInput.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);

    try {
      const payload = {
        title,
        slug,
        moduleId: selectedModuleId,
        difficulty,
        estimatedMin,
        content,
        tags,
        companies,
        isPublished
      };

      await api.patch(`/admin/lessons/${lessonId}`, payload);
      // Reload metadata
      const res = await api.get(`/admin/lessons/${lessonId}`);
      setLesson(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save updates');
    } finally {
      setSaving(false);
    }
  };

  // Create new Quiz
  const handleCreateQuiz = async () => {
    if (!lesson) return;
    setCreatingQuiz(true);
    try {
      await api.post('/admin/quizzes', {
        lessonId: lesson.id,
        title: `${lesson.title} Checkpoint`,
        passingScore: 70,
        isRequired: false
      });
      // Reload
      await loadData();
    } catch (err: any) {
      alert('Failed to initialize quiz');
    } finally {
      setCreatingQuiz(false);
    }
  };

  // Manage Question Modal
  const openNewQuestion = () => {
    setEditingQuestion(null);
    setQContent('');
    setQOptA('');
    setQOptB('');
    setQOptC('');
    setQOptD('');
    setQCorrect('A');
    setQExplanation('');
    setShowQuestionModal(true);
  };

  const openEditQuestion = (q: Question) => {
    setEditingQuestion(q);
    setQContent(q.content);
    setQOptA(q.options[0] || '');
    setQOptB(q.options[1] || '');
    setQOptC(q.options[2] || '');
    setQOptD(q.options[3] || '');
    
    // Find index of correctAnswer
    const idx = q.options.indexOf(q.correctAnswer);
    const letter = idx === 0 ? 'A' : idx === 1 ? 'B' : idx === 2 ? 'C' : 'D';
    setQCorrect(letter);
    
    setQExplanation(q.explanation);
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lesson || lesson.quizzes.length === 0) return;

    const quiz = lesson.quizzes[0];
    const options = [qOptA.trim(), qOptB.trim(), qOptC.trim(), qOptD.trim()].filter(Boolean);
    
    if (options.length < 2) {
      alert('At least two options are required');
      return;
    }

    // Map correct letter back to the actual string option
    const correctIdx = qCorrect === 'A' ? 0 : qCorrect === 'B' ? 1 : qCorrect === 'C' ? 2 : 3;
    const correctAnswer = options[correctIdx];

    if (!correctAnswer) {
      alert('Selected correct option cannot be blank');
      return;
    }

    setSaving(true);
    try {
      if (editingQuestion) {
        // Edit existing question
        await api.patch(`/admin/questions/${editingQuestion.id}`, {
          content: qContent,
          options,
          correctAnswer,
          explanation: qExplanation
        });
      } else {
        // Create new question
        await api.post('/admin/questions', {
          quizId: quiz.id,
          type: 'multiple_choice',
          content: qContent,
          options,
          correctAnswer,
          explanation: qExplanation,
          order: quiz.questions.length + 1
        });
      }
      setShowQuestionModal(false);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await api.delete(`/admin/questions/${id}`);
      await loadData();
    } catch (err: any) {
      alert('Failed to delete question');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-base)' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <Loader2 style={{ width: '36px', height: '36px', color: 'var(--accent-amber)' }} className="animate-spin" />
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }} className="mono">LOADING CURRICULUM DATA...</p>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div style={{ padding: '60px 40px', maxWidth: '600px', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
        <AlertCircle style={{ width: '48px', height: '48px', color: '#F87171' }} />
        <h2 className="bricolage" style={{ fontSize: '22px', color: 'var(--text-primary)', margin: 0 }}>Editor Error</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>{error || 'Failed to mount curriculum editor.'}</p>
        <Link href="/admin/content/lessons" style={{ padding: '10px 20px', background: 'var(--accent-amber)', color: '#080B14', border: 'none', borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: 700 }}>
          Back to lessons
        </Link>
      </div>
    );
  }

  const quiz = lesson.quizzes?.[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-base)' }}>
      
      {/* Header toolbar */}
      <div style={{
        height: '56px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: 'var(--bg-surface)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/admin/content/lessons" style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            padding: '6px',
            borderRadius: '6px',
            textDecoration: 'none'
          }}>
            <ChevronLeft style={{ width: '20px', height: '20px' }} />
          </Link>
          <div>
            <h2 className="bricolage" style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>
              Edit Lesson
            </h2>
            <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-muted)' }}>
              /{slug}
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveLesson}
          disabled={saving}
          style={{
            padding: '8px 16px',
            background: 'var(--accent-amber)',
            color: '#080B14',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {saving ? <Loader2 style={{ width: '14px', height: '14px' }} className="animate-spin" /> : <Save style={{ width: '14px', height: '14px' }} />}
          <span>{saving ? 'Saving...' : 'Save Lesson'}</span>
        </button>
      </div>

      {/* Main split dashboard */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Panel: Properties Form */}
        <div style={{
          width: '360px',
          borderRight: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto',
          flexShrink: 0
        }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
            <Settings style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Properties
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="mono">LESSON TITLE</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="mono">URL SLUG</label>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              required
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="mono">TARGET MODULE</label>
            <select
              value={selectedModuleId}
              onChange={e => setSelectedModuleId(e.target.value)}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              {modules.map(m => (
                <option key={m.id} value={m.id}>
                  L{m.track?.level} · {m.track?.name} — {m.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="mono">DIFFICULTY</label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="mono">EST MINUTES</label>
              <input
                type="number"
                min="1"
                value={estimatedMin}
                onChange={e => setEstimatedMin(parseInt(e.target.value) || 10)}
                required
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="mono">TAGS</label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              placeholder="caching, redis"
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="mono">COMPANIES</label>
            <input
              type="text"
              value={companiesInput}
              onChange={e => setCompaniesInput(e.target.value)}
              placeholder="google, stripe"
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
            <input
              type="checkbox"
              id="isPublished"
              checked={isPublished}
              onChange={e => setIsPublished(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                cursor: 'pointer',
                accentColor: 'var(--accent-amber)'
              }}
            />
            <label htmlFor="isPublished" style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>
              Lesson published & active
            </label>
          </div>

        </div>

        {/* Right Side: Tabbed MDX Content vs Quiz Manager */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Tabs header */}
          <div style={{ display: 'flex', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <button
              onClick={() => setActiveCenterTab('content')}
              className="mono"
              style={{
                padding: '14px 24px',
                background: activeCenterTab === 'content' ? 'var(--bg-base)' : 'transparent',
                border: 'none',
                borderBottom: activeCenterTab === 'content' ? '2px solid var(--accent-amber)' : '2px solid transparent',
                color: activeCenterTab === 'content' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                cursor: 'pointer',
                marginBottom: '-1px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText style={{ width: '13px', height: '13px' }} />
                <span>MDX CONTENT</span>
              </div>
            </button>

            <button
              onClick={() => setActiveCenterTab('quiz')}
              className="mono"
              style={{
                padding: '14px 24px',
                background: activeCenterTab === 'quiz' ? 'var(--bg-base)' : 'transparent',
                border: 'none',
                borderBottom: activeCenterTab === 'quiz' ? '2px solid var(--accent-amber)' : '2px solid transparent',
                color: activeCenterTab === 'quiz' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                cursor: 'pointer',
                marginBottom: '-1px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileQuestion style={{ width: '13px', height: '13px' }} />
                <span>QUIZ CHECKPOINT ({quiz?.questions?.length || 0})</span>
              </div>
            </button>
          </div>

          {/* Tab Content Panels */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* CONTENT TAB */}
            {activeCenterTab === 'content' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1e1e1e' }}>
                <Editor
                  height="100%"
                  defaultLanguage="markdown"
                  theme="vs-dark"
                  value={content}
                  onChange={(val) => setContent(val || '')}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    padding: { top: 16 }
                  }}
                />
              </div>
            )}

            {/* QUIZ TAB */}
            {activeCenterTab === 'quiz' && (
              <div style={{ flex: 1, padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {!quiz ? (
                  <div style={{
                    border: '2px dashed var(--border)',
                    borderRadius: '12px',
                    padding: '48px 24px',
                    textAlign: 'center',
                    maxWidth: '480px',
                    margin: '40px auto 0',
                    color: 'var(--text-muted)'
                  }}>
                    <FileQuestion style={{ width: '36px', height: '36px', margin: '0 auto 12px', opacity: 0.4 }} />
                    <h3 className="bricolage" style={{ fontSize: '16px', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>No Checkpoint Active</h3>
                    <p style={{ margin: '4px 0 20px', fontSize: '12px' }}>
                      Add an interactive knowledge check to test engineers on this lesson's key takeaways.
                    </p>
                    <button
                      onClick={handleCreateQuiz}
                      disabled={creatingQuiz}
                      style={{
                        padding: '10px 20px',
                        background: 'var(--accent-amber)',
                        color: '#080B14',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        margin: '0 auto'
                      }}
                    >
                      {creatingQuiz && <Loader2 style={{ width: '12px', height: '12px' }} className="animate-spin" />}
                      <span>Create Quiz Checkpoint</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Quiz settings bar */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      padding: '16px 20px'
                    }}>
                      <div>
                        <h3 className="bricolage" style={{ fontSize: '16px', color: 'var(--text-primary)', margin: 0 }}>
                          {quiz.title}
                        </h3>
                        <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                          Passing score: <strong style={{ color: 'var(--accent-amber)' }}>{quiz.passingScore}%</strong>
                        </p>
                      </div>

                      <button
                        onClick={openNewQuestion}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          background: 'transparent',
                          border: '1px solid var(--border-bright)',
                          color: 'var(--text-primary)',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        <Plus style={{ width: '13px', height: '13px' }} />
                        <span>Add Question</span>
                      </button>
                    </div>

                    {/* Question List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {quiz.questions.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '32px 0' }}>
                          This quiz has no questions yet. Click "Add Question" above.
                        </p>
                      ) : (
                        quiz.questions.map((q, qIndex) => (
                          <div
                            key={q.id}
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border)',
                              borderRadius: '10px',
                              padding: '20px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '14px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                              <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.4, fontWeight: 700 }}>
                                <span className="mono" style={{ color: 'var(--accent-amber)', marginRight: '6px' }}>Q{qIndex + 1}.</span>
                                {q.content}
                              </h4>

                              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                <button
                                  onClick={() => openEditQuestion(q)}
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                  title="Edit"
                                >
                                  <Edit style={{ width: '13px', height: '13px' }} />
                                </button>
                                <button
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                                  title="Delete"
                                >
                                  <Trash style={{ width: '13px', height: '13px' }} />
                                </button>
                              </div>
                            </div>

                            {/* Options */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              {q.options.map((opt, oIdx) => {
                                const isCorrect = opt === q.correctAnswer;
                                const letter = oIdx === 0 ? 'A' : oIdx === 1 ? 'B' : oIdx === 2 ? 'C' : 'D';
                                return (
                                  <div
                                    key={oIdx}
                                    style={{
                                      padding: '8px 12px',
                                      borderRadius: '6px',
                                      background: isCorrect ? 'rgba(54,201,142,0.06)' : 'var(--bg-elevated)',
                                      border: isCorrect ? '1px solid rgba(54,201,142,0.2)' : '1px solid var(--border)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px'
                                    }}
                                  >
                                    <span className="mono" style={{ fontSize: '10px', fontWeight: 700, color: isCorrect ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                                      {letter}.
                                    </span>
                                    <span style={{ fontSize: '11px', color: isCorrect ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                                      {opt}
                                    </span>
                                    {isCorrect && <Check style={{ width: '12px', height: '12px', color: 'var(--accent-green)', marginLeft: 'auto' }} />}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Explanation */}
                            {q.explanation && (
                              <div style={{
                                padding: '12px 14px',
                                background: 'var(--bg-elevated)',
                                borderLeft: '3px solid var(--border-bright)',
                                fontSize: '11px',
                                color: 'var(--text-muted)',
                                lineHeight: 1.4
                              }}>
                                <strong className="mono" style={{ fontSize: '9px', color: 'var(--text-secondary)', display: 'block', marginBottom: '2px' }}>EXPLANATION</strong>
                                {q.explanation}
                              </div>
                            )}

                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}

              </div>
            )}

          </div>

        </div>

      </div>

      {/* Question Create/Edit Modal */}
      {showQuestionModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(8,11,20,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '28px',
            maxWidth: '520px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div>
              <h3 className="bricolage" style={{ fontSize: '18px', color: 'var(--text-primary)', margin: 0, fontWeight: 800 }}>
                {editingQuestion ? 'Edit MCQ Question' : 'Add MCQ Question'}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
                Draft the prompt, standard options, and write the architectural reasoning.
              </p>
            </div>

            <form onSubmit={handleSaveQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '9px', color: 'var(--text-muted)' }} className="mono">QUESTION PROMPT</label>
                <textarea
                  placeholder="e.g. Which of the following is a key differentiator of L7 load balancing?"
                  value={qContent}
                  onChange={e => setQContent(e.target.value)}
                  required
                  rows={2}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '9px', color: 'var(--text-muted)' }} className="mono">OPTIONS</label>
                
                {[
                  { label: 'A', val: qOptA, set: setQOptA },
                  { label: 'B', val: qOptB, set: setQOptB },
                  { label: 'C', val: qOptC, set: setQOptC },
                  { label: 'D', val: qOptD, set: setQOptD },
                ].map(opt => (
                  <div key={opt.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="mono" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>{opt.label}</span>
                    <input
                      type="text"
                      placeholder={`Option ${opt.label} text`}
                      value={opt.val}
                      onChange={e => opt.set(e.target.value)}
                      required
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none'
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Correct option selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '9px', color: 'var(--text-muted)' }} className="mono">CORRECT ANSWER</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {['A', 'B', 'C', 'D'].map(l => (
                    <label key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="correctAnswer"
                        value={l}
                        checked={qCorrect === l}
                        onChange={() => setQCorrect(l)}
                        style={{ accentColor: 'var(--accent-amber)', cursor: 'pointer' }}
                      />
                      <span className="mono">{l}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Explanation */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '9px', color: 'var(--text-muted)' }} className="mono">EXPLANATION / REASONING</label>
                <textarea
                  placeholder="Explain why the selected option is correct..."
                  value={qExplanation}
                  onChange={e => setQExplanation(e.target.value)}
                  required
                  rows={2}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    outline: 'none',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  style={{
                    padding: '8px 14px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '8px 18px',
                    background: 'var(--accent-amber)',
                    color: '#080B14',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {saving && <Loader2 style={{ width: '12px', height: '12px' }} className="animate-spin" />}
                  <span>Save Question</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
