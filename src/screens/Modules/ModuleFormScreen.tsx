import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { spacing } from '../../theme/spacing';
import { useAppState } from '../../context/AppStateContext';
import { mockCourse } from '../../data/mockData';
import './FormScreen.css';

export const ModuleFormScreen: React.FC = () => {
  const { moduleId } = useParams<{ moduleId?: string }>();
  const navigate = useNavigate();
  const { modules, createModule, updateModule } = useAppState();
  const existing = moduleId ? modules.find((m) => m.id === moduleId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description);
    }
  }, [existing]);

  const handleSave = () => {
    if (!name) {
      alert('Name is required');
      return;
    }
    if (existing) {
      updateModule({ ...existing, name, description });
    } else {
      createModule({
        courseId: mockCourse.id,
        name,
        description,
        exerciseCount: 0,
        averageCompletion: 0
      });
    }
    navigate(-1);
  };

  return (
    <ScreenContainer>
      <h2 className="form-title">{existing ? 'Edit Module' : 'New Module'}</h2>
      <Input label="Module name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Module title" />
      <Input
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short description"
      />
      <div className="form-actions">
        <Button variant="secondary" onClick={() => navigate(-1)} style={{ flex: 1, marginRight: spacing.sm }}>
          Cancel
        </Button>
        <Button onClick={handleSave} style={{ flex: 1 }}>
          Save module
        </Button>
      </div>
    </ScreenContainer>
  );
};
