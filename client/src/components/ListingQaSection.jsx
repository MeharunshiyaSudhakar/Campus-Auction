import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import getSocket from '../services/socket';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Lock,
  CornerDownRight,
} from 'lucide-react';

export default function ListingQaSection({ listingId, isSeller }) {
  const { user } = useAuth();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [remainingCount, setRemainingCount] = useState(3);

  // New question form state
  const [questionText, setQuestionText] = useState('');
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState(null);
  const [askSuccess, setAskSuccess] = useState(null);

  // Seller reply form states (map of questionId -> replyText)
  const [replyMap, setReplyMap] = useState({});
  const [replyingId, setReplyingId] = useState(null);
  const [replyError, setReplyError] = useState(null);

  const fetchQuestions = async () => {
    try {
      const res = await api.get(`/qa/listing/${listingId}`);
      const data = res.data?.data;
      if (data) {
        setQuestions(data.questions || []);
        setRemainingCount(data.remainingCount !== undefined ? data.remainingCount : 3);
      }
    } catch (err) {
      console.warn('Failed to load Q&A:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();

    const socket = getSocket();
    const handleNewQuestion = (data) => {
      if (data.listingId === listingId) {
        setQuestions((prev) => [data.question, ...prev]);
      }
    };

    const handleQuestionAnswered = (data) => {
      if (data.listingId === listingId) {
        setQuestions((prev) =>
          prev.map((q) =>
            q._id === data.questionId
              ? { ...q, answer: data.answer, isAnswered: true, answeredAt: data.answeredAt }
              : q
          )
        );
      }
    };

    socket.on('new_question', handleNewQuestion);
    socket.on('question_answered', handleQuestionAnswered);

    return () => {
      socket.off('new_question', handleNewQuestion);
      socket.off('question_answered', handleQuestionAnswered);
    };
  }, [listingId]);

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    setAskError(null);
    setAskSuccess(null);

    if (!questionText.trim() || questionText.trim().length < 5) {
      setAskError('Question must be at least 5 characters long');
      return;
    }

    setAsking(true);
    try {
      const res = await api.post(`/qa/listing/${listingId}`, {
        question: questionText.trim(),
      });
      const created = res.data?.data;
      setQuestions((prev) => [created, ...prev]);
      setRemainingCount((prev) => Math.max(0, prev - 1));
      setQuestionText('');
      setAskSuccess('Question submitted! The seller has been notified to reply.');
      setTimeout(() => setAskSuccess(null), 5000);
    } catch (err) {
      console.error('Ask question failed:', err);
      setAskError(err.response?.data?.message || 'Failed to submit question. Please try again.');
    } finally {
      setAsking(false);
    }
  };

  const handleAnswerQuestion = async (questionId) => {
    const answer = replyMap[questionId];
    if (!answer || answer.trim().length < 2) {
      setReplyError('Answer must be at least 2 characters');
      return;
    }

    setReplyingId(questionId);
    setReplyError(null);
    try {
      const res = await api.post ? await api.put(`/qa/${questionId}/answer`, { answer: answer.trim() }) : null;
      const updated = res.data?.data;
      setQuestions((prev) =>
        prev.map((q) => (q._id === questionId ? updated : q))
      );
      setReplyMap((prev) => ({ ...prev, [questionId]: '' }));
    } catch (err) {
      console.error('Answer question failed:', err);
      setReplyError(err.response?.data?.message || 'Failed to publish answer');
    } finally {
      setReplyingId(null);
    }
  };

  return (
    <div className="bg-warm-white-paper rounded-3xl border-2 border-sage/60 p-6 sm:p-7 space-y-6 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sage/40 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-charcoal text-warm-white flex items-center justify-center shadow-xs border border-charcoal">
            <MessageSquare className="w-5 h-5 text-amber" />
          </div>
          <div>
            <h2 className="text-lg font-black text-charcoal">Public Q&A Before Bidding</h2>
            <p className="text-xs text-charcoal-muted">
              Transparent questions answered by the seller. Visible to all students.
            </p>
          </div>
        </div>

        {user && !isSeller && (
          <span className="text-xs font-black px-3 py-1 rounded-full bg-sage-100 text-charcoal border border-sage">
            {remainingCount} of 3 questions remaining
          </span>
        )}
      </div>

      {/* Ask Question Form (For prospective buyers) */}
      {!isSeller && user && (
        <form onSubmit={handleAskQuestion} className="space-y-3 bg-warm-white p-4 rounded-2xl border border-sage/60">
          <div className="flex items-center justify-between text-xs text-charcoal-muted">
            <label className="font-black text-charcoal uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber" />
              <span>Ask the Senior Seller</span>
            </label>
            <span className="text-[11px] font-semibold">{questionText.length}/500</span>
          </div>

          <textarea
            rows={2}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            disabled={remainingCount <= 0 || asking}
            placeholder={
              remainingCount > 0
                ? "e.g., 'Are the cycle brakes recently adjusted?', 'Does the calculator come with cover?'"
                : 'You have reached the limit of 3 questions on this listing.'
            }
            className="w-full p-3 rounded-xl border border-sage/70 bg-warm-white-paper text-sm text-charcoal placeholder:text-charcoal-muted/60 focus:outline-none focus:ring-2 focus:ring-charcoal/20 focus:border-charcoal resize-none font-medium"
          />

          {askError && (
            <p className="text-xs text-red-600 font-bold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {askError}
            </p>
          )}

          {askSuccess && (
            <p className="text-xs text-charcoal font-bold flex items-center gap-1 bg-sage-100 p-2 rounded-xl border border-sage">
              <CheckCircle2 className="w-3.5 h-3.5 text-sage-dark" />
              {askSuccess}
            </p>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-charcoal-muted font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber" />
              <span>Max 3 questions per student &bull; No external links</span>
            </span>

            <button
              type="submit"
              disabled={remainingCount <= 0 || asking || !questionText.trim()}
              className="px-4 py-2 rounded-xl bg-charcoal hover:bg-charcoal-hover disabled:opacity-50 text-warm-white text-xs font-black flex items-center gap-1.5 shadow-xs cursor-pointer transition-all border border-charcoal"
            >
              <Send className="w-3.5 h-3.5 text-amber" />
              <span>{asking ? 'Submitting...' : 'Post Question'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Guest Prompt if not logged in */}
      {!user && (
        <div className="p-4 rounded-2xl bg-warm-white border border-sage/50 text-center space-y-1">
          <p className="text-xs font-bold text-forest">Have a question about this item?</p>
          <p className="text-xs text-charcoal-muted">Log in with your university account to ask the seller directly.</p>
        </div>
      )}

      {/* List of Questions & Answers */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-16 bg-sage/15 rounded-2xl" />
            <div className="h-16 bg-sage/15 rounded-2xl" />
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-8 text-charcoal-muted text-xs font-semibold space-y-1">
            <MessageSquare className="w-8 h-8 text-sage mx-auto" />
            <p>No questions asked yet.</p>
            <p className="text-[11px]">Be the first to ask the seller about item specs or condition!</p>
          </div>
        ) : (
          questions.map((q) => (
            <div
              key={q._id}
              className="p-4 rounded-2xl bg-warm-white border border-sage/50 space-y-3 transition-all hover:border-sage"
            >
              {/* Question Row */}
              <div className="flex items-start gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-forest text-warm-white text-[10px] font-black uppercase shrink-0 mt-0.5">
                  Q
                </span>
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-bold text-forest leading-snug">{q.question}</p>
                  <div className="flex items-center gap-2 text-[10px] text-charcoal-muted font-semibold">
                    <span>Asked by {q.asker?.name || 'Fellow Student'}</span>
                    <span>&bull;</span>
                    <span>{new Date(q.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Answer Row */}
              {q.isAnswered ? (
                <div className="flex items-start gap-2.5 pl-6 border-l-2 border-amber/60 pt-1">
                  <CornerDownRight className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-semibold text-charcoal bg-amber/10 p-3 rounded-xl border border-amber/30">
                      {q.answer}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-forest font-bold">
                      <CheckCircle2 className="w-3 h-3 text-forest" />
                      <span>Answered by Seller &bull; {new Date(q.answeredAt || q.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ) : isSeller ? (
                /* Inline Reply Form for Seller */
                <div className="pl-6 border-l-2 border-forest/40 pt-2 space-y-2">
                  <label className="text-xs font-black text-forest block">
                    Reply to this student's question:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type your answer to publish it publicly..."
                      value={replyMap[q._id] || ''}
                      onChange={(e) =>
                        setReplyMap({ ...replyMap, [q._id]: e.target.value })
                      }
                      className="flex-1 px-3 py-2 text-xs rounded-xl border border-sage bg-warm-white-paper text-forest focus:outline-none font-medium"
                    />
                    <button
                      onClick={() => handleAnswerQuestion(q._id)}
                      disabled={replyingId === q._id}
                      className="px-4 py-2 rounded-xl bg-forest hover:bg-forest-light text-warm-white text-xs font-black cursor-pointer shadow-xs"
                    >
                      {replyingId === q._id ? 'Publishing...' : 'Reply'}
                    </button>
                  </div>
                  {replyError && replyingId === q._id && (
                    <p className="text-xs text-red-600 font-bold">{replyError}</p>
                  )}
                </div>
              ) : (
                /* Awaiting Seller Reply Banner */
                <div className="pl-6 text-xs text-charcoal-muted italic flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber animate-pulse" />
                  <span>Awaiting answer from seller...</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
