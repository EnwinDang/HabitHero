import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SectionHeader } from '../../components/SectionHeader';
import { Badge } from '../../components/Badge';
import { ProgressBar } from '../../components/ProgressBar';
import { Button } from '../../components/Button';
import { spacing } from '../../theme/spacing';
import { useAppState } from '../../context/AppStateContext';
import './StudentDetailScreen.css';

export const StudentDetailScreen: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { studentDetails } = useAppState();
  const student = studentId ? studentDetails[studentId] : undefined;

  if (!student) {
    return (
      <ScreenContainer>
        <div>Student not found</div>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <SectionHeader
        title={student.alias}
        subtitle={`Level ${student.xpLevel} · ${student.completionPercent}% completion`}
        rightContent={
          <Badge
            type="status"
            variant={student.status}
            label={student.status === 'on-track' ? 'On track' : student.status}
          />
        }
      />

      <div className="section">
        <h3 className="section-title">Module Progress</h3>
        <div>
          {student.moduleProgress.map((item) => {
            const value = (item.completedExercises / item.totalExercises) * 100;
            return (
              <div key={item.moduleId} className="progress-row">
                <div className="module-name">
                  {item.moduleName} · {item.completedExercises}/{item.totalExercises} exercises
                </div>
                <ProgressBar value={value} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="section">
        <h3 className="section-title">Completion Timeline</h3>
        <div>
          {student.recentCompletions.map((item, idx) => (
            <div key={`${item.exerciseTitle}-${idx}`} className="timeline-row">
              <div className="timeline-title">{item.exerciseTitle}</div>
              <div className="muted">
                {item.moduleName} · {item.completedAt}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Button variant="secondary" onClick={() => navigate(-1)} fullWidth>
        Back to student list
      </Button>
    </ScreenContainer>
  );
};
