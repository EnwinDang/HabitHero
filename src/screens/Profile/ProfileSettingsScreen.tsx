import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SectionHeader } from '../../components/SectionHeader';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { spacing } from '../../theme/spacing';
import { useAppState } from '../../context/AppStateContext';
import { mockCourse } from '../../data/mockData';
import './ProfileSettingsScreen.css';

export const ProfileSettingsScreen: React.FC = () => {
  const { teacher, logout } = useAppState();
  const navigate = useNavigate();
  const [name, setName] = useState(teacher?.fullName ?? '');
  const [showStatusLabels, setShowStatusLabels] = useState(true);
  const [course, setCourse] = useState(mockCourse.name);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <ScreenContainer>
      <SectionHeader title="Profile & Settings" />

      <div className="section">
        <h3 className="section-title">Profile Info</h3>
        <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="School email" value={teacher?.email ?? ''} disabled />
      </div>

      <div className="section">
        <h3 className="section-title">Account</h3>
        <Input label="Old password" value="" onChange={() => {}} type="password" />
        <Input label="New password" value="" onChange={() => {}} type="password" />
        <Input label="Confirm new password" value="" onChange={() => {}} type="password" />
        <Button variant="secondary" onClick={() => {}}>
          Change password
        </Button>
      </div>

      <div className="section">
        <h3 className="section-title">Course Settings</h3>
        <Input label="Default course" value={course} onChange={(e) => setCourse(e.target.value)} />
        <div className="toggle-row">
          <span className="toggle-label">Show status labels</span>
          <Button
            variant="secondary"
            onClick={() => setShowStatusLabels((v) => !v)}
            style={{ width: '140px' }}
          >
            {showStatusLabels ? 'Hide labels' : 'Show labels'}
          </Button>
        </div>
      </div>

      <Button variant="danger" onClick={handleLogout} fullWidth>
        Log out
      </Button>
    </ScreenContainer>
  );
};
