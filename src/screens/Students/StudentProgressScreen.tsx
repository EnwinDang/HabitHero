import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SectionHeader } from '../../components/SectionHeader';
import { ProgressBar } from '../../components/ProgressBar';
import { Badge } from '../../components/Badge';
import { TableRow } from '../../components/TableRow';
import { spacing } from '../../theme/spacing';
import { useAppState } from '../../context/AppStateContext';
import { mockCourse } from '../../data/mockData';
import './StudentProgressScreen.css';

const sortOptions = ['Name', 'Level', 'Completion'] as const;
type SortOption = (typeof sortOptions)[number];

export const StudentProgressScreen: React.FC = () => {
  const navigate = useNavigate();
  const { students } = useAppState();
  const [statusFilter, setStatusFilter] = useState<'all' | 'ahead' | 'on-track' | 'behind'>('all');
  const [sort, setSort] = useState<SortOption>('Name');

  const filtered = useMemo(() => {
    let list = [...students];
    if (statusFilter !== 'all') {
      list = list.filter((s) => s.status === statusFilter);
    }
    list.sort((a, b) => {
      if (sort === 'Name') return a.alias.localeCompare(b.alias);
      if (sort === 'Level') return b.xpLevel - a.xpLevel;
      return b.completionPercent - a.completionPercent;
    });
    return list;
  }, [students, statusFilter, sort]);

  return (
    <ScreenContainer>
      <SectionHeader
        title="Student Progress – Programming Essentials 1"
        subtitle={mockCourse.name}
        rightContent={<span className="meta-text">{students.length} students</span>}
      />

      <div className="filters">
        {(['all', 'ahead', 'on-track', 'behind'] as const).map((f) => (
          <button
            key={f}
            className={`filter-chip ${statusFilter === f ? 'filter-chip-active' : ''}`}
            onClick={() => setStatusFilter(f)}
            type="button"
          >
            {f === 'all' ? 'All' : f.replace('-', ' ')}
          </button>
        ))}
      </div>

      <div className="filters">
        {sortOptions.map((option) => (
          <button
            key={option}
            className={`sort-chip ${sort === option ? 'sort-chip-active' : ''}`}
            onClick={() => setSort(option)}
            type="button"
          >
            {option}
          </button>
        ))}
      </div>

      <div>
        {filtered.map((item) => (
          <TableRow
            key={item.id}
            title={item.alias}
            subtitle={`Level ${item.xpLevel} · ${item.exercisesCompleted}/${item.totalExercises} exercises`}
            onClick={() => navigate(`/students/${item.id}`)}
            rightContent={
              <div className="student-right">
                <ProgressBar value={item.completionPercent} />
                <div className="percent">{item.completionPercent}%</div>
                <Badge
                  type="status"
                  variant={item.status}
                  label={item.status === 'on-track' ? 'On track' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  style={{ marginTop: 4 }}
                />
              </div>
            }
          />
        ))}
      </div>
    </ScreenContainer>
  );
};
