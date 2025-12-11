import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SectionHeader } from '../../components/SectionHeader';
import { Button } from '../../components/Button';
import { TableRow } from '../../components/TableRow';
import { spacing } from '../../theme/spacing';
import { useAppState } from '../../context/AppStateContext';
import { mockCourse } from '../../data/mockData';
import './ModulesScreen.css';

export const ModulesScreen: React.FC = () => {
  const navigate = useNavigate();
  const { modules } = useAppState();

  return (
    <ScreenContainer>
      <SectionHeader
        title="Modules – Programming Essentials 1"
        subtitle={mockCourse.name}
        rightContent={
          <Button onClick={() => navigate('/modules/new')}>+ New Module</Button>
        }
      />
      <div>
        {modules.map((item) => (
          <TableRow
            key={item.id}
            title={item.name}
            subtitle={item.description}
            onClick={() => navigate(`/modules/${item.id}`)}
            rightContent={
              <div className="module-meta">
                <div className="meta-text">{item.exerciseCount} exercises</div>
                <div className="meta-text">{item.averageCompletion}% avg</div>
              </div>
            }
          />
        ))}
      </div>
    </ScreenContainer>
  );
};
