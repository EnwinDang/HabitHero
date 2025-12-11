import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { spacing } from '../../theme/spacing';
import { Difficulty, ExerciseStatus } from '../../types/exercise';
import { useAppState } from '../../context/AppStateContext';
import './FormScreen.css';

export const ExerciseFormScreen: React.FC = () => {
  const { moduleId, exerciseId } = useParams<{ moduleId: string; exerciseId?: string }>();
  const navigate = useNavigate();
  const { exercises, createExercise, updateExercise } = useAppState();
  const existing = exerciseId ? exercises.find((e) => e.id === exerciseId) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>(existing?.difficulty ?? 'easy');
  const [recommendedDate, setRecommendedDate] = useState(existing?.recommendedDate ?? '');
  const [canvasLink, setCanvasLink] = useState(existing?.canvasLink ?? '');
  const [status, setStatus] = useState<ExerciseStatus>(existing?.status ?? 'active');

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setDescription(existing.description);
      setDifficulty(existing.difficulty);
      setRecommendedDate(existing.recommendedDate);
      setCanvasLink(existing.canvasLink ?? '');
      setStatus(existing.status);
    }
  }, [existing]);

  const handleSave = () => {
    if (!title) {
      alert('Title required');
      return;
    }
    if (!moduleId) return;
    
    if (existing) {
      updateExercise({ ...existing, title, description, difficulty, recommendedDate, canvasLink, status });
    } else {
      createExercise({
        moduleId,
        title,
        description,
        difficulty,
        recommendedDate,
        status,
        studentsCompleted: 0,
        studentsTotal: 30,
        canvasLink: canvasLink || undefined
      });
    }
    navigate(-1);
  };

  return (
    <ScreenContainer>
      <h2 className="form-title">{existing ? 'Edit Exercise' : 'New Exercise'}</h2>
      <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Exercise title" />
      <Input
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What should students do?"
      />
      <label className="form-label">Difficulty</label>
      <div className="form-chips">
        {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
          <button
            key={level}
            className={`form-chip ${difficulty === level ? 'form-chip-active' : ''}`}
            onClick={() => setDifficulty(level)}
            type="button"
          >
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </button>
        ))}
      </div>
      <Input
        label="Recommended date"
        value={recommendedDate}
        onChange={(e) => setRecommendedDate(e.target.value)}
        placeholder="YYYY-MM-DD"
      />
      <Input
        label="Canvas link (optional)"
        value={canvasLink}
        onChange={(e) => setCanvasLink(e.target.value)}
        placeholder="https://canvas..."
      />

      <label className="form-label">Status</label>
      <div className="form-chips">
        {(['active', 'hidden'] as ExerciseStatus[]).map((s) => (
          <button
            key={s}
            className={`form-chip ${status === s ? 'form-chip-active' : ''}`}
            onClick={() => setStatus(s)}
            type="button"
          >
            {s === 'active' ? 'Active' : 'Hidden'}
          </button>
        ))}
      </div>

      <div className="form-actions">
        <Button variant="secondary" onClick={() => navigate(-1)} style={{ flex: 1, marginRight: spacing.sm }}>
          Cancel
        </Button>
        <Button onClick={handleSave} style={{ flex: 1 }}>
          Save exercise
        </Button>
      </div>
    </ScreenContainer>
  );
};
