import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Calendar, ArrowLeft } from 'lucide-react';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Table } from '../../components/Table';
import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { Textarea } from '../../components/Textarea';
import { Select } from '../../components/Select';
import { spacing } from '../../theme/spacing';
import { useAppState } from '../../context/AppStateContext';
import { Exercise, Difficulty, ExerciseStatus } from '../../types/exercise';
import './ModuleDetailScreen.css';

export const ModuleDetailScreen: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { modules, exercises, createExercise, updateExercise, deleteExercise } = useAppState();
  const module = modules.find((m) => m.id === moduleId);
  const moduleExercises = useMemo(
    () => exercises.filter((e) => e.moduleId === moduleId),
    [exercises, moduleId]
  );

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'medium' as Difficulty,
    recommendedDate: '',
    canvasLink: '',
    status: 'active' as ExerciseStatus,
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      difficulty: 'medium',
      recommendedDate: '',
      canvasLink: '',
      status: 'active',
    });
  };

  const handleAddExercise = () => {
    if (!moduleId || !formData.title) return;
    
    createExercise({
      moduleId,
      title: formData.title,
      description: formData.description,
      difficulty: formData.difficulty,
      recommendedDate: formData.recommendedDate,
      status: formData.status,
      studentsCompleted: 0,
      studentsTotal: 30,
      canvasLink: formData.canvasLink || undefined,
    });
    setIsAddModalOpen(false);
    resetForm();
  };

  const handleEditExercise = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setFormData({
      title: exercise.title,
      description: exercise.description,
      difficulty: exercise.difficulty,
      recommendedDate: exercise.recommendedDate,
      canvasLink: exercise.canvasLink || '',
      status: exercise.status,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingExercise) return;
    
    updateExercise({
      ...editingExercise,
      ...formData,
      canvasLink: formData.canvasLink || undefined,
    });
    setIsEditModalOpen(false);
    setEditingExercise(null);
    resetForm();
  };

  const handleDeleteExercise = (exerciseId: string) => {
    if (confirm('Are you sure you want to delete this exercise?')) {
      deleteExercise(exerciseId);
    }
  };

  if (!module) {
    return (
      <ScreenContainer>
        <div>Module not found.</div>
      </ScreenContainer>
    );
  }

  const columns = [
    {
      key: 'title',
      label: 'Exercise Title',
      width: '25%',
    },
    {
      key: 'difficulty',
      label: 'Difficulty',
      width: '12%',
      render: (value: Difficulty) => (
        <Badge
          type="difficulty"
          variant={value}
          label={value.charAt(0).toUpperCase() + value.slice(1)}
        />
      ),
    },
    {
      key: 'recommendedDate',
      label: 'Recommended Date',
      width: '15%',
      render: (value: string) => (
        <div className="date-cell">
          <Calendar size={16} className="date-icon" />
          {value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set'}
        </div>
      ),
    },
    {
      key: 'studentsCompleted',
      label: 'Completed',
      width: '15%',
      render: (value: number, row: Exercise) => (
        <span className="completion-text">
          {value} / {row.studentsTotal}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      width: '10%',
      render: (value: ExerciseStatus) => (
        <Badge
          type="pill"
          variant={value === 'active' ? 'active' : 'hidden'}
          label={value === 'active' ? 'Active' : 'Hidden'}
        />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '13%',
      render: (value: any, row: Exercise) => (
        <div className="table-actions">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditExercise(row);
            }}
            className="action-button"
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteExercise(row.id);
            }}
            className="action-button action-button-danger"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const difficultyOptions = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'hidden', label: 'Hidden' },
  ];

  const ExerciseForm = () => (
    <div className="exercise-form">
      <Input
        label="Exercise Title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        placeholder="e.g. Variables and Data Types"
      />
      <Textarea
        label="Exercise Description / Instructions"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="Detailed instructions for the exercise..."
      />
      <Select
        label="Difficulty"
        options={difficultyOptions}
        value={formData.difficulty}
        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
      />
      <Input
        label="Recommended Completion Date"
        type="date"
        value={formData.recommendedDate}
        onChange={(e) => setFormData({ ...formData, recommendedDate: e.target.value })}
      />
      <Input
        label="Link to Canvas (Optional)"
        value={formData.canvasLink}
        onChange={(e) => setFormData({ ...formData, canvasLink: e.target.value })}
        placeholder="https://canvas.school.edu/..."
      />
      <Select
        label="Status"
        options={statusOptions}
        value={formData.status}
        onChange={(e) => setFormData({ ...formData, status: e.target.value as ExerciseStatus })}
      />
    </div>
  );

  return (
    <ScreenContainer>
      {/* Header */}
      <div className="module-header">
        <div className="module-header-top">
          <div>
            <h1 className="module-title">{module.name}</h1>
            <p className="module-description">{module.description}</p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus size={20} style={{ marginRight: 8 }} />
            Add Exercise
          </Button>
        </div>
        <Button variant="secondary" onClick={() => navigate('/modules')}>
          <ArrowLeft size={16} style={{ marginRight: 8 }} />
          Back to Modules
        </Button>
      </div>

      {/* Exercises Table */}
      <Table columns={columns} data={moduleExercises} />

      {/* Add Exercise Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        title="Add New Exercise"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddExercise} disabled={!formData.title}>
              Save Exercise
            </Button>
          </>
        }
      >
        <ExerciseForm />
      </Modal>

      {/* Edit Exercise Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingExercise(null);
          resetForm();
        }}
        title="Edit Exercise"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={!formData.title}>
              Save Changes
            </Button>
          </>
        }
      >
        <ExerciseForm />
      </Modal>
    </ScreenContainer>
  );
};
